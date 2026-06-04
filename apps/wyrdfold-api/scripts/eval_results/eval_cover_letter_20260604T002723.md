# Cover Letter Eval — Sonnet 4.6 vs GPT-5.1 vs Haiku 4.5

## How to read this

Each of the 5 sections below shows three anonymized drafts (A, B, C) for the same job. Read each blind, then pick the strongest. Tie is allowed. The model->label mapping lives in the raw JSON; do not open it until you've picked.

## Per-model cost / latency (writer call only)

| Model      | Schema fails | $ total | Avg latency |
| ---------- | ------------ | ------- | ----------- |
| sonnet-4.6 | 1            | $0.1793 | 19416ms     |
| gpt-5.1    | 0            | $0.0646 | 7975ms      |
| haiku-4.5  | 0            | $0.0654 | 12641ms     |

Judge (Opus 4.7) total cost: **$0.1110**.

## Judge scores (Opus 4.7, anonymized A/B/C)

| Case     | Title                                    | A rank | B rank | C rank | Sum scores A | B   | C   |
| -------- | ---------------------------------------- | ------ | ------ | ------ | ------------ | --- | --- |
| 77a68740 | Senior Manager, Customer Experience Stra | 2      | 1      | 3      | 6            | 6   | 3   |
| 3f5e0600 | Manager, Software Development Engineerin | 3      | 1      | 2      | 3            | 5   | 4   |
| 2c669178 | Lead Workday Engineer (People Tech & AI) | 2      | 1      | 3      | 3            | 4   | 3   |
| db093078 | Talent Coordinator - FTC                 | 3      | 1      | 2      | 2            | 5   | 4   |
| 4e9513a6 | Tech Lead Manager, Admin Console         | 3      | 2      | 1      | 0            | 3   | 4   |

## Anonymized drafts (please pick)

### Case 1: Senior Manager, Customer Experience Strategy

_Job posting id (for raw-JSON cross-reference):_ `77a68740-9472-4203-b648-1f751d2cce98`

**JD excerpt:**

> <div class="content-intro"><p><span style="font-family: arial, helvetica, sans-serif;"><strong>Who we are</strong></span></p> <p><span style="font-weight: 300; font-family: arial, helvetica, sans-serif;">Samsara (NYSE: IOT) is the pioneer of the Connected Operations™ Cloud, which is a platform that enables organizations that depend on physical operations to harness Internet of Things (IoT) data to develop actionable insights and improve their operations. At Samsara, we are helping improve the safety, efficiency and sustainability of the physical operations that power our global economy. Representing more than 40% of global GDP, these industries are the infrastructure of our planet, including agriculture, construction, field services, transportation, and manufacturing — and we are excited t

#### Draft A

I am drawn to the Senior Manager, Customer Experience Strategy role at Acme Co because it aligns with my core strength: building AI-driven CX systems that unify customer intelligence and drive measurable operational improvements. As Director of Customer Service and Support at Obagi Medical, I architected scalable service frameworks across four distinct channels—international B2B distributors, domestic wholesale, direct-to-physician, and DTC ecommerce—each requiring channel-specific automation, compliance, and growth strategies. That work taught me how to blend technology infrastructure with human insight to solve complex, cross-functional CX challenges at scale.

Your emphasis on AI-powered signal analysis and Voice of Customer program management resonates directly with my experience. At CX Collective, I led process reengineering and AI-driven workflow optimization for enterprise clients, including a 73% reduction in time-to-resolution for a publicly traded EV charging company and implementation of AI-powered chatbots in Zendesk that cut online interaction time by 6–8 minutes per contact. I have also designed comprehensive VOC programs: at Joany, I implemented CSAT, NPS, and CES targets and harmonized customer feedback loops across engineering, marketing, and finance teams. These initiatives taught me how to translate raw feedback into actionable insights that move metrics.

At Thrive Causemetics, I sustained employee NPS scores of 67–89 while elevating CSAT to 96–98% and CPC below $2, all while the company grew 300% over five years. I did this by building KPI dashboards, running quality assurance training for 70%+ of contacts, and establishing closed-loop feedback systems—including a product malfunction resolution process that caught a component issue within three days of launch. I am proficient in Zendesk, Salesforce Service Cloud, NetSuite, and AI chatbot platforms, and I bring hands-on expertise in omnichannel support, customer journey mapping, and data-driven decision making.

I would welcome a conversation about how I can bring this combination of AI-first thinking, VoC rigor, and operational discipline to Acme Co's customer experience strategy function.

#### Draft B

Dear Acme Co Hiring Team,

The Senior Manager, Customer Experience Strategy role sits at the intersection of AI-driven insight, VoC program design, and operational execution, and that is precisely where I have spent the last several years building. At Thrive Causemetics, I directed CX strategy across a period of 300% business growth, generating $1M+ in annual cost savings while holding CSAT at 96-98% and cost per contact below $2. I am confident I can bring that same combination of strategic rigor and hands-on execution to Acme Co.

On the AI and automation side, my record is concrete. At Thrive Causemetics, I deployed an AI-enabled automated chatbot that cut manual intervention for online sales by 50%, and implemented automated triage systems that protected $500K-$1M in revenue on high-stakes promotional days by surfacing critical issues within the same hour they emerged. At CX Collective, I shortened issue resolution time from 30 days to 8 for a publicly traded EV charging company through Salesforce Service Cloud reengineering, and slashed an internal support backlog by 86%, from over 7 days to 1 day, using automated data collection and simplified escalation matrices.

On the VoC and insights side, I have built the listening infrastructure, not just consumed its outputs. At Joany, I implemented CSAT, NPS, and Customer Effort Score targets and harmonized those feedback loops across engineering, marketing, and finance. At Thrive Causemetics, I established a QA training program covering 70%+ of contacts and developed a cross-functional feedback loop between Legal and Quality Control that resolved a product component malfunction within three days of launch. I also improved data reliability and agent productivity through Salesforce and NetSuite integration combined with AI-driven knowledge management during my consulting work at CX Collective.

I would welcome a conversation about how this background maps to what your team is building. I am happy to go deeper on any of these programs at your convenience.

Sincerely,

#### Draft C

As a CX leader who has built AI-driven customer insight and service capabilities across fast-scaling B2B and B2C environments, I am excited by the Senior Manager, Customer Experience Strategy role at Acme Co. Most recently at Obagi Medical, I led end-to-end customer service strategy across complex international and domestic channels and captured monthly revenue previously lost due to manual backorder handling by building a trackable system and coordinating with distributors.

My background aligns closely with an AI-first CX intelligence function and real-time customer listening. At CX Collective, I shortened issue resolution time for publicly traded EV charging company through comprehensive process reengineering and AI-driven workflow optimization via Salesforce Service Cloud and improved data reliability and agent productivity through Salesforce/NetSuite integration, omnichannel support, and AI-driven knowledge management. I also saved time per call and per online interaction for traditional family-owned jewelry company by deploying AI-powered chatbot in Zendesk and slashed internal customer support backlog and rectified SLA adherence with automated data collection and simplified escalation matrices.

I have also built scalable, insight-rich CX programs inside high-growth consumer brands. At Thrive Causemetics, I generated annual cost savings and maintained pace with business growth over five years by scaling omnichannel and social customer support while elevating customer satisfaction scores and cost per contact while exceeding SLA targets through KPIs, reporting, and structured feedback workflows. There, I decreased manual intervention for online sales by replacing human contacts with AI-enabled automated chatbot and transferring calls to text via IVR and guaranteed quality for majority of contacts by establishing QA training program with eLearning, knowledge management, and professional development plans.

I would welcome the opportunity to discuss how this mix of AI-powered signal analysis, VoC-focused operations, and cross-functional CX leadership can support Acme Co’s customer experience strategy. Thank you for your consideration.

**Judge rationale:** B leads with the sharpest structure, mapping concrete metrics directly to the JD's AI, VoC, and closed-loop pillars. A is nearly as strong with rich evidence but slightly less tightly organized around the JD. C reuses similar experiences but strips out specific numbers, making claims feel vaguer and less compelling.

---

### Case 2: Manager, Software Development Engineering

_Job posting id (for raw-JSON cross-reference):_ `3f5e0600-1645-4913-828b-90cd7752e4d6`

**JD excerpt:**

> <div class="content-intro"><p><strong>Who we are</strong></p> <p>At CarGurus (NASDAQ: CARG), our mission is to give people the power to reach their destination. We started as a small team of developers determined to bring trust and transparency to car shopping. Since then, our history of innovation and go-to-market acceleration has driven industry-leading growth. In fact, we’re the largest and fastest-growing automotive marketplace, and we’ve been profitable for over 15 years.</p> <p><strong>What we do</strong></p> <p>The market is evolving, and we are too, moving the entire automotive journey online and guiding our customers through every step. That includes everything from the sale of an old car to the financing, purchase, and delivery of a new one. Today, tens of millions of consumers v

#### Draft A

I am drawn to this Manager, Software Development Engineering role at Acme Co because it sits at the intersection of operational transformation and cross-functional leadership—two areas where I have delivered measurable impact. While my background is rooted in customer experience and operations rather than software engineering, my track record scaling teams, automating complex workflows, and driving organizational change through technology aligns directly with the engineering management competencies this role demands.

At Obagi Medical, I led end-to-end service transformation across four distinct sales channels by architecting scalable automation frameworks. I eliminated manual order closures in Oracle, reducing human error and accelerating system syncs across ordering, 3PL, and ERP systems. I also cut PO closure time from 1.5 months to 2 weeks by implementing structured tracking and tagging systems—work that required deep collaboration with engineering and operations teams to translate business requirements into sustainable technical solutions. This experience taught me how to align technical roadmaps with business outcomes and coach cross-functional teams through process change.

At CX Collective, I managed consulting engagements for companies undergoing operational inefficiencies, leading process reengineering initiatives that spanned Salesforce Service Cloud, NetSuite, and AI-driven workflow optimization. I delivered 100% of projects on time while adapting to accelerated deadlines and shifting priorities—the kind of adaptability and stakeholder management that engineering managers need when leading teams through rapid technical transitions.

I recognize this role is building engineering teams, not customer experience functions. What I bring is proven ability to lead teams through complex transformation, translate strategic intent into executable roadmaps, and use data-driven decision-making to prioritize impact. I would welcome a conversation about how my experience scaling operations and driving organizational adoption of new systems can contribute to your engineering leadership.

Best regards,

#### Draft B

The Manager, Software Development Engineering role at Acme Co caught my attention because of its focus on leading teams through operational transformation and delivering outcomes at scale. My background is in CX leadership rather than software engineering management, and I want to be direct about that. However, if Acme Co is looking for a technically fluent, outcomes-oriented leader who has driven AI-native workflow adoption, cross-functional execution, and measurable operational improvement across complex environments, there may still be a conversation worth having.

My most relevant work spans AI-driven process redesign and end-to-end workflow ownership. At CX Collective, I led process reengineering for a publicly traded EV charging company that shortened issue resolution time by 73%, from 30 days to 8, using Salesforce Service Cloud. For a separate client, deploying an AI-powered chatbot in Zendesk saved over a minute per call and six to eight minutes per online interaction. I also cut an internal support backlog by 86%, from over seven days to one, by introducing automated data collection and simplified escalation logic. These projects required scoping ambiguous problems, aligning stakeholders across functions, and shipping solutions on fixed timelines. I delivered 100% of consulting engagements on time.

At Thrive Causemetics, I owned CX technology strategy across a five-year period of 300% business growth, generating over $1M in annual cost savings while sustaining CSAT of 96 to 98%. I implemented automated triage systems that protected $500K to $1M in revenue on high-traffic promotional days, and replaced manual contacts with AI-enabled automation that cut manual intervention by 50%. At Obagi Medical, I eliminated manual order closures in Oracle entirely, accelerating system syncs across the ordering portal, 3PL, and ERP, and recovered $300K or more in monthly revenue that had been lost to untracked backorder handling. These outcomes required deep collaboration with engineering, operations, and product counterparts, which is where much of the real execution happened.

I recognize this role is centered on managing software engineers, and I would welcome a direct conversation about where my experience maps well and where it does not. If Acme Co sees potential fit, I am glad to explore it further.

#### Draft C

Your Manager, Software Development Engineering role stands out because it sits at the intersection of AI-native transformation, scalable systems, and customer journeys. Across B2B, B2C, and B2B2C environments, I have led CX and technical support organizations through similar inflection points, most recently as Director of Customer Service and Support at Obagi Medical, where I captured monthly revenue previously lost due to manual backorder handling by building a trackable system and coordinating with distributors.

A core part of your mandate is building reliable, efficient systems that remove friction at critical moments in the journey. At Obagi Medical, I cut PO closure time for domestic wholesale by centralizing tracking, tagging blockers, and aligning 3PL priorities with end-of-month revenue targets, and eliminated manual order closures in Oracle, reducing human error and accelerating system syncs between ordering portal, 3PL, and ERP. Earlier, as Head of Client Services at CX Collective, I shortened issue resolution time for a publicly traded EV charging company through comprehensive process reengineering and AI-driven workflow optimization via Salesforce Service Cloud and improved data reliability and agent productivity through Salesforce/NetSuite integration, omnichannel support, and AI-driven knowledge management.

Your focus on AI-first development aligns with how I have modernized support experiences. At Thrive Causemetics, I decreased manual intervention for online sales by replacing human contacts with an AI-enabled automated chatbot and transferring calls to text via IVR, which drove 50% fewer manual interventions and reduced costs by two-thirds. At CX Collective, I saved time per call and per online interaction for a traditional family-owned jewelry company by deploying an AI-powered chatbot in Zendesk and slashed internal customer support backlog and rectified SLA adherence with automated data collection and simplified escalation matrices.

I would welcome the chance to discuss how this background in AI-enabled operations, system integration, and customer journey optimization could support Acme Co’s engineering goals for this team. Thank you for your consideration.

**Judge rationale:** All three candidates face the same fundamental misalignment (CX/ops background applying to a software engineering management role), but B handles it most effectively by acknowledging the gap directly, leading with the strongest quantified outcomes, and inviting honest conversation. C is evidence-rich but stretches connections to AI-native engineering less convincingly, while A is the least specifi

---

### Case 3: Lead Workday Engineer (People Tech & AI)

_Job posting id (for raw-JSON cross-reference):_ `2c669178-f420-4fd8-80e8-189e0278bd6b`

**JD excerpt:**

> <div class="content-intro"><p>About <strong>Zscaler</strong></p> <p>Zscaler accelerates digital transformation to ensure our customers can be more agile, efficient, resilient, and secure. As an <strong>AI-forward enterprise</strong>, we are constantly pushing the envelope, leveraging the world’s largest security data lake to power our cloud-native Zero Trust Exchange platform. This innovation protects our customers from cyberattacks and data loss by securely connecting users, devices, and applications in any location.</p> <p>Here, <strong>impact in your role matters more than title</strong> and trust is built on results. We say, impact over activity. We seek innovators who actively use AI to amplify their impact and who thrive in an environment where we leverage intelligent systems to stay

#### Draft A

Zscaler’s focus on being an AI-forward enterprise and its culture of impact over activity aligns directly with how I have led customer and internal support organizations. In my current role as Director of Customer Service and Support at Obagi Medical, I captured monthly revenue previously lost due to manual backorder handling by building a trackable system and coordinating with distributors, and I am excited by the opportunity to bring similar AI-minded, systems-first thinking to your Lead Workday Engineer (People Tech & AI) role.

Across recent roles I led complex systems and process transformations that parallel what you seek in a People Tech leader. At CX Collective, I shortened issue resolution time for a publicly traded EV charging company through comprehensive process reengineering and AI-driven workflow optimization via Salesforce Service Cloud. I also improved data reliability and agent productivity through Salesforce/NetSuite integration, omnichannel support, and AI-driven knowledge management. At Obagi Medical, I eliminated manual order closures in Oracle, reducing human error and accelerating system syncs between ordering portal, 3PL, and ERP, and cut PO closure time for domestic wholesale by centralizing tracking, tagging blockers, and aligning 3PL priorities with end-of-month revenue targets.

I also bring a track record of using AI tools and automation to increase both quality and efficiency, which I see as central to an AI-focused Workday ecosystem. At Thrive Causemetics, I decreased manual intervention for online sales by replacing human contacts with an AI-enabled automated chatbot and transferring calls to text via IVR, which led to 50% fewer manual interventions and reduced costs by two-thirds. At CX Collective, I saved time per call and per online interaction for a traditional family-owned jewelry company by deploying an AI-powered chatbot in Zendesk, and slashed internal customer support backlog and rectified SLA adherence with automated data collection and simplified escalation matrices.

I would welcome the chance to discuss how this background in systems integration, AI-driven optimization, and high-accountability leadership could support your People Tech & AI roadmap. Thank you for your consideration.

Best regards,
Anonymous Candidate

#### Draft B

I am drawn to this Lead Workday Engineer role because it bridges two areas where I have driven measurable impact: AI-driven process optimization and cross-functional systems integration. Most recently as Director of Customer Service and Support at Obagi Medical, I architected scalable service frameworks across multiple channels by automating order-to-cash workflows and eliminating manual system closures in Oracle, reducing human error while accelerating syncs between ordering systems, 3PL, and ERP infrastructure. That same discipline of translating operational friction into systematic solutions applies directly to your need for a leader who can evolve Workday to support your organization's people tech roadmap.

Across three Director-level CX roles, I have built and scaled systems that prioritize data integrity and automation. At CX Collective, I delivered 100% of consulting projects on time by integrating Salesforce and NetSuite, improving data reliability and agent productivity through omnichannel support and AI-driven knowledge management. At Thrive Causemetics, I scaled omnichannel support across Zendesk, NetSuite, and Shopify while sustaining employee NPS scores of 67–89, demonstrating how rigorous process design and people-focused metrics drive both operational excellence and retention. These experiences equipped me to lead technical projects where accuracy and adoption go hand in hand.

I bring hands-on expertise in process reengineering, change management, and cross-functional collaboration—skills essential for a Lead Engineer overseeing a complex enterprise system. I have diagnosed and solved system bottlenecks repeatedly: cutting PO closure time from 1.5 months to 2 weeks by centralizing tracking and aligning priorities, trimming 2+ days off international order resolution by automating portal dialogue, and slashing internal backlog by 86% through automated data collection and simplified workflows. This track record of moving quickly without sacrificing quality, combined with my fluency in enterprise platforms and my commitment to building systems that teams adopt confidently, positions me to drive meaningful impact on your Workday roadmap.

I would welcome a conversation about how my experience scaling systems and leading teams through operational transformation can support Zscaler's people tech evolution. Thank you for considering my background.

#### Draft C

The Lead Workday Engineer role caught my attention, but I want to be direct with you: my background is in customer experience leadership, not Workday engineering or HR technology. I am a CX and operations director with deep experience in AI-driven automation, process reengineering, and cross-functional systems integration across B2B, B2C, and B2B2C environments. If Acme Co is seeking someone with Workday configuration or HRIS engineering credentials, I am not that candidate. If there is an adjacent opening where operational transformation, AI deployment, and scalable process design are the core need, I would welcome that conversation.

My work has consistently centered on identifying broken workflows and replacing them with structured, automated systems. At Obagi Medical, I eliminated manual order closures in Oracle entirely, reducing human error and accelerating syncs between the ordering portal, 3PL, and ERP. In the same role, I cut PO closure time for domestic wholesale from 1.5 months to 2 weeks by centralizing tracking and aligning operational priorities across teams. These were not incremental tweaks. They were system-level redesigns that required cross-functional alignment, change management, and durable process architecture.

On the AI and automation side, I deployed AI-powered chatbots in Zendesk that saved over 6 to 8 minutes per online interaction for one client and cut a support backlog by 86% for another, dropping resolution time from 7 days to 1. At Thrive Causemetics, I reduced manual intervention for online sales by 50% through an AI-enabled chatbot and IVR call-to-text transfer, generating annual cost savings exceeding $1M while the business grew 300%. These outcomes required scoping AI tools against operational gaps, building agent and stakeholder buy-in, and measuring impact through KPI dashboards and structured feedback workflows.

I recognize this role as posted sits outside my core domain, and I am not applying on false pretenses. If there is a fit somewhere at Acme Co where an operator who builds AI-augmented service systems and cross-functional process infrastructure would add value, I would be glad to explore it. I am happy to connect for a brief conversation at your convenience.

**Judge rationale:** B is strongest: evidence-rich with quantified outcomes and attempts to bridge CX/systems work to the Workday/people tech ask. A makes similar claims but with fewer hard numbers and weaker framing. C is candid and specific but explicitly disqualifies itself from the JD, undermining alignment.

---

### Case 4: Talent Coordinator - FTC

_Job posting id (for raw-JSON cross-reference):_ `db093078-d797-4e7a-9236-6905a511f923`

**JD excerpt:**

> <div class="content-intro"><h2><strong>About us&nbsp;</strong>&nbsp;&nbsp;</h2> <p>Founded in 2017, Wayve is the leading developer of Embodied AI technology.&nbsp; Our advanced AI software and foundation models enable vehicles to perceive, understand, and navigate any complex environment, enhancing the usability and safety of automated driving systems.</p> <p>Our vision is to create autonomy that propels the world forward.&nbsp; Our intelligent, mapless, and hardware-agnostic AI products are designed for automakers, accelerating the transition from assisted to automated driving.&nbsp; <br><br>In our fast-paced environment big problems ignite us—we embrace uncertainty, leaning into complex challenges to unlock groundbreaking solutions. We aim high and stay humble in our pursuit of excellenc

#### Draft A

The Talent Coordinator role at Acme Co caught my attention, but I want to be straightforward: my background is in customer experience leadership, not talent acquisition coordination. I have a strong record of managing high-volume operations, cross-functional communication, and process design across complex environments, and I can bring those capabilities to a coordination role. That said, the fit between my specific experience and this position is limited, and I want to represent that honestly rather than overstate the alignment.

Where I do see relevant overlap is in operational rigor and stakeholder communication. In my current role at Obagi Medical, I manage workflows across international distributors, domestic wholesale, and DTC channels simultaneously, coordinating between internal teams, third-party logistics partners, and technology systems to keep processes moving accurately and on time. The kind of calendar management, status tracking, and multi-party coordination a Talent Coordinator handles daily is structurally similar to what I do across order-to-cash and claims resolution workflows.

Earlier, as Head of Client Services at CX Collective, I delivered 100% of consulting projects on time across a varied client portfolio while adapting to shifting priorities and accelerated timelines. Keeping multiple workstreams organized and communicating clearly with stakeholders under pressure is something I have done consistently. I also have direct experience building and improving the experience of people moving through a structured process, which is at the core of candidate coordination.

I recognize this role is a different track than my recent work, and I would welcome a conversation to assess whether the fit makes sense for your team's needs. I am happy to speak at your convenience.

#### Draft B

Wayve’s mission around groundbreaking AI and its emphasis on a high-quality candidate experience align strongly with how I approach customer and stakeholder journeys. Across my CX leadership roles, I have focused on building smooth, reliable processes at scale, such as when I generated $1M+ in annual cost savings while keeping pace with 300% business growth by scaling omnichannel and social customer support. That same operational discipline and focus on experience is what I would bring to the Talent Coordinator role.

In my current position as Director of Customer Service and Support at Obagi Medical, I own end-to-end service operations across multiple channels and regions. I captured $300K+ in monthly revenue previously lost due to manual backorder handling by building a trackable system and coordinating with distributors, and I cut PO closure time for domestic wholesale from 1.5 months to 2 weeks by centralizing tracking and aligning 3PL priorities. These outcomes depended on impeccable coordination, time-sensitive communication with many stakeholders, and accurate tracking of details, much like managing complex, high-volume interview schedules.

Previously, as Head of Client Services at CX Collective, I steered support operations and consulting projects across multiple clients using Salesforce Service Cloud and Zendesk. I shortened issue resolution time by 73% (from 30 days to 8 days) for an EV charging company through process reengineering and AI-driven workflow optimization, and I delivered 100% of consulting projects on time while slashing an internal support backlog by 86%. These projects required me to manage competing priorities, provide timely updates, and ensure every touchpoint felt professional and well-organized for internal and external stakeholders.

I would welcome the opportunity to bring this operational rigor and service mindset to your Talent team and help ensure candidates have a seamless, positive experience during this critical growth phase. I look forward to the possibility of discussing how I can support your hiring goals.

#### Draft C

I am writing to express my interest in the Talent Coordinator position at Acme Co. While my background is rooted in customer experience operations, I bring a disciplined approach to process coordination, cross-functional communication, and delivering positive outcomes under high-volume, time-sensitive conditions—all core to this role. At Obagi Medical, I led end-to-end service coordination across multiple channels, managing complex workflows, stakeholder alignment, and rapid turnarounds. This same organizational rigor and commitment to seamless execution will translate directly to candidate coordination and interview scheduling.

Throughout my career, I have built scalable processes that prioritize user experience and operational efficiency. At Thrive Causemetics, I directed omnichannel support operations and maintained strict SLA adherence while coordinating across internal teams and external partners. I also established quality assurance training programs that guaranteed consistent, high-touch service for 70%+ of interactions. At CX Collective, I delivered 100% of consulting projects on time while managing shifting priorities and competing deadlines. These experiences demonstrate my ability to juggle multiple stakeholders, adapt to accelerated timelines, and maintain meticulous attention to detail—essential for high-volume candidate coordination.

I excel at cross-functional collaboration and have consistently harmonized communication loops between departments. At Joany, I implemented feedback mechanisms across engineering, marketing, and finance teams to foster alignment around shared goals. I bring the same structured approach to people coordination—ensuring candidates feel supported, interviews run smoothly, and internal teams have visibility into the hiring pipeline. My track record of building feedback loops, managing timelines, and creating positive experiences in high-pressure environments positions me to contribute immediately to Wayve's talent operations.

I would welcome the opportunity to discuss how my operational expertise and commitment to candidate experience can support Wayve's growth. Thank you for your consideration.

**Judge rationale:** Draft B leads with the strongest quantified outcomes and frames them persuasively as transferable to coordination. Draft C is more tightly aligned to the JD's candidate-experience language but with softer evidence. Draft A undersells the candidate by explicitly hedging the fit.

---

### Case 5: Tech Lead Manager, Admin Console

_Job posting id (for raw-JSON cross-reference):_ `4e9513a6-008b-4c0c-bd1b-d0a80e6fd153`

**JD excerpt:**

> <div class="content-intro"><div><span style="font-family: helvetica, arial, sans-serif; color: rgb(0, 0, 0); font-size: 12pt;"><strong>About Glean:</strong></span></div> <div>&nbsp;</div> <div><span style="font-size: 12pt; font-family: helvetica, arial, sans-serif;">Glean is the Work AI platform that helps everyone work smarter with AI. What began as the industry’s most advanced enterprise search has evolved into a full-scale Work AI ecosystem, powering intelligent Search, an AI Assistant, and scalable AI agents on one secure, open platform. With over 100 enterprise SaaS connectors, flexible LLM choice, and robust APIs, Glean gives organizations the infrastructure to govern, scale, and customize AI across their entire business - without vendor lock-in or costly implementation cycles.</span

#### Draft A

_(schema fail — see raw JSON)_

#### Draft B

I am writing to apply for the Tech Lead Manager, Admin Console role at Acme Co. With over a decade of experience architecting and leading operational systems—from Oracle ERP integrations and 3PL workflows to Salesforce and NetSuite platforms—I've consistently delivered scalable infrastructure that removes friction and unlocks revenue. Most recently, I led end-to-end customer service strategy at Obagi Medical across four distinct channels, where I eliminated manual order closures in Oracle entirely, reduced PO closure time from 1.5 months to 2 weeks, and captured $300K+ in monthly revenue previously lost to backorder mismanagement. This combination of technical platform expertise, process automation depth, and cross-functional leadership aligns directly with what an admin console platform requires.

At Obagi, I built channel-specific automation frameworks that scaled from domestic wholesale to international B2B and DTC operations. I automated dialogue flows within the ordering portal to replace email loops, trimming 2+ days off international resolution time, and integrated 3PL tracking systems with our ERP to eliminate human error and accelerate syncs. This work demanded not just technical fluency with complex systems but the ability to translate business requirements into concrete automation wins. At CX Collective, I extended this capability by optimizing workflows across Salesforce Service Cloud, NetSuite, and Zendesk for consulting clients—shortening time-to-resolution by 73% for an EV charging company and slashing internal support backlog by 86% through data-driven process reengineering. I delivered 100% of projects on time by combining Agile project management discipline with change management rigor.

Before that, as Director of Customer Experience at Thrive Causemetics, I scaled omnichannel support across Zendesk, NetSuite, and Shopify while the business grew 300% in five years. I generated $1M+ in annual cost savings by automating chatbot triage systems, built quality assurance coverage for 70%+ of contacts through structured training and knowledge management, and implemented KPI dashboards that kept teams aligned on SLA targets. I also led process automation that reduced manual intervention 50% and architected real-time monitoring systems that minimized revenue loss during high-volume promotional events.

I'm drawn to Acme Co because you're solving for a critical enterprise need: making admin consoles intuitive, scalable, and trustworthy for diverse user bases. My track record shows I can lead technical product teams through complex integrations, anticipate scaling bottlenecks, and ship systems that measurably reduce operational friction. I'd welcome the opportunity to discuss how my experience building fault-tolerant, user-centric platforms can contribute to your roadmap. Thank you for your consideration.

#### Draft C

Glean’s vision for a Work AI platform that delivers measurable business impact aligns closely with how I have built and scaled customer experience and operations. In my current role as Director of Customer Service and Support at Obagi Medical, I captured monthly revenue previously lost due to manual backorder handling by building a trackable system and coordinating with distributors, which mirrors your focus on turning advanced technology into concrete outcomes.

You are looking for a leader who can translate complex systems into intuitive, scalable experiences. At Obagi Medical, I trimmed days off international order resolution time by automating dialogue within the ordering portal, replacing email loops with structured request flows, and eliminated manual order closures in Oracle, reducing human error and accelerating system syncs between ordering portal, 3PL, and ERP. These efforts also cut PO closure time for domestic wholesale by centralizing tracking, tagging blockers, and aligning 3PL priorities with end-of-month revenue targets. This is the level of end-to-end systems thinking and process automation I would bring to the Admin Console at Acme Co.

Across prior roles I have combined AI-driven solutions with strong operational rigor. As Head of Client Services at CX Collective, I shortened issue resolution time for a publicly traded EV charging company through comprehensive process reengineering and AI-driven workflow optimization via Salesforce Service Cloud, and I saved time per call and per online interaction for a traditional family-owned jewelry company by deploying an AI-powered chatbot in Zendesk. Earlier, as Director of Customer Experience at Thrive Causemetics, I generated annual cost savings and maintained pace with business growth over five years by scaling omnichannel and social customer support, while decreasing manual intervention for online sales by replacing human contacts with an AI-enabled automated chatbot and transferring calls to text via IVR.

I would welcome the chance to discuss how this mix of AI-forward operations, cross-functional collaboration, and scalable process design can support the next phase of Glean’s platform and the Admin Console roadmap at Acme Co.

**Judge rationale:** Draft A is empty. Draft C edges out B by referencing Glean's mission and AI-driven work, slightly better aligning with a Work AI platform role, though both candidates' customer-service backgrounds are a weak fit for a Tech Lead Manager engineering role.

---
