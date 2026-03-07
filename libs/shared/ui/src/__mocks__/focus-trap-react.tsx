import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  focusTrapOptions?: Record<string, unknown>;
}

// Passthrough mock — focus-trap relies on layout which jsdom doesn't support
export default class FocusTrap extends Component<Props> {
  override render() {
    return this.props.children;
  }
}
