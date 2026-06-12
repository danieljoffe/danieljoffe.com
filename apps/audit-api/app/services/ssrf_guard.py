"""SSRF defense for outbound URL fetches.

Mirror of `apps/wyrdfold-api/app/services/validate.py` (the SSRF half).
Lighthouse + axe scan a user-supplied URL via headless Chromium / a Node
subprocess — without resolving the hostname here, an attacker can pass a
real DNS name like ``metadata.evil.com`` that resolves to
``169.254.169.254`` (cloud metadata) or any RFC1918 / loopback address,
and the scan response would echo back internal infrastructure content.

The Pydantic validator on `RunScanRequest` already blocks raw IP literals
and three hardcoded hostnames, but DNS resolution is the missing layer.

Note: this does not protect against DNS rebinding (the resolver may
return a different IP between this check and the Lighthouse subprocess
opening the socket). Full mitigation requires pinning the resolved IP
at request time.
"""

from __future__ import annotations

import ipaddress
import logging
import socket

logger = logging.getLogger(__name__)


def _is_disallowed_address(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Return True if *ip* falls in any range we refuse to fetch from."""
    if ip.is_loopback or ip.is_link_local or ip.is_private:
        return True
    if ip.is_multicast or ip.is_unspecified or ip.is_reserved:
        return True
    # IPv4-mapped (::ffff:x.x.x.x) and IPv4-compat IPv6 — re-check the
    # embedded v4 against the v4 ranges. Short-circuit narrows to v6.
    return (
        isinstance(ip, ipaddress.IPv6Address)
        and ip.ipv4_mapped is not None
        and _is_disallowed_address(ip.ipv4_mapped)
    )


def _resolve_addresses(
    hostname: str,
) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Resolve *hostname* to all addresses (A + AAAA). Empty on failure."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return []
    seen: set[str] = set()
    out: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    for info in infos:
        sockaddr = info[4]
        addr_str = str(sockaddr[0])
        if addr_str in seen:
            continue
        seen.add(addr_str)
        try:
            out.append(ipaddress.ip_address(addr_str))
        except ValueError:
            continue
    return out


def assert_safe_host(hostname: str) -> None:
    """Raise ValueError if *hostname* resolves to a disallowed address.

    Call this before any outbound fetch of a user-supplied URL.
    """
    addrs = _resolve_addresses(hostname)
    if not addrs:
        raise ValueError(f"hostname did not resolve: {hostname}")
    for addr in addrs:
        if _is_disallowed_address(addr):
            logger.warning(
                "ssrf_block: %s resolved to disallowed address %s", hostname, addr
            )
            raise ValueError(
                f"hostname {hostname} resolves to a disallowed address ({addr})"
            )
