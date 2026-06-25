# McDonald Order Management System - Agent Instructions

## Project Overview

This project implements a McDonald's order management system that handles order queueing with VIP priority and dynamic bot management. The system must demonstrate all requirements specified in `se-take-home-assignment/README.md`.

## Core Requirements Summary

- **Frontend Option**: Any framework, deploy to public URL
- **Backend Option**: Go or Node.js CLI application for GitHub Actions
- **Order Priority**: VIP orders processed before Normal orders
- **Bot Management**: Add/remove bots dynamically, each bot processes 1 order at a time (10 seconds)
- **No Persistence**: All operations in memory
- **GitHub Flow**: Submit changes via Pull Request
- **Testing**: Comprehensive test coverage required

---

## Role Definitions

### 0. Collaborator / Project Coordinator

**Role Overview:**
The Collaborator acts as the orchestrator for all other agents. This role ensures smooth coordination between Product Owner, Software Architect, Developer, and QA Engineer throughout the project lifecycle.

**Responsibilities:**
- **Task Delegation**: Assign tasks to the appropriate agent based on their expertise and current workload
- **Progress Tracking**: Monitor the status of all ongoing tasks and ensure they align with the timeline
- **Conflict Resolution**: Mediate disagreements between agents regarding design decisions, implementation approach, or priorities
- **Quality Gates**: Verify that each phase completes successfully before moving to the next phase
- **Communication Hub**: Ensure all agents have the necessary context and information to perform their tasks
- **Risk Management**: Identify potential blockers early and coordinate solutions

**Coordination Workflow:**

```
Phase 1: Planning
├── Collaborator → Product Owner: Define requirements and acceptance criteria
├── Collaborator → Architect: Design system architecture
└── Collaborator: Review and approve the plan

Phase 2: Implementation
├── Collaborator → Developer: Assign implementation tasks
├── Collaborator → Developer: Provide architectural guidance as needed
└── Collaborator: Track implementation progress

Phase 3: Testing
├── Collaborator → QA: Assign test planning tasks
├── Collaborator → Developer: Route bugs back for fixes
└── Collaborator: Verify test coverage and results

Phase 4: Documentation
├── Collaborator → All: Gather required documentation
└── Collaborator: Compile and review final documentation

Phase 5: Submission
├── Collaborator → Developer: Ensure scripts and build pass
└── Collaborator: Final review before PR submission
```

**Key Decisions:**
- Determine task priority when multiple urgent items exist
- Decide when to escalate issues requiring human input
- Balance quality vs. time constraints
- Allocate time buffer for unexpected issues

**Deliverables:**
- Task breakdown and assignment plan
- Phase completion checklists
- Risk assessment report
- Final project status summary

**Success Metrics:**
- All agents complete their tasks on schedule
- No critical information is lost between phases
- Conflicts are resolved without blocking progress
- Final deliverable meets all requirements

---

### 1. Product Owner

**Responsibilities:**
- Define and clarify product requirements from `se-take-home-assignment/README.md`
- Ensure all user stories are met:
  - Normal customer order submission
  - VIP member order submission with priority
  - Manager bot management (add/remove bots)
  - Bot processing behavior (10 seconds per order)
- Validate that the prototype demonstrates all functional requirements
- Ensure documentation is complete and clear

**Key Decisions:**
- Confirm frontend or backend implementation approach
- Define acceptance criteria for each feature
- Prioritize features for the 1-hour development window

**Deliverables:**
- Requirements documentation
- Acceptance criteria checklist
- Feature priority list

---

### 2. Software Architect

**Responsibilities:**
- Design system architecture (frontend or backend)
- Define component structure and data flow
- Choose appropriate technology stack
- Design order queue data structure with VIP/Normal priority
- Design bot management system with lifecycle tracking

**Key Decisions:**
- **If Frontend**: Choose framework (React, Vue, Angular, etc.), state management, UI component library
- **If Backend**: Choose Go or Node.js, CLI framework, testing framework, project structure
- Order queue implementation (priority queue, separate queues, etc.)
- Bot state management (IDLE, PROCESSING states)
- Concurrency model for bot processing

**Deliverables:**
- Architecture diagram
- Component design document
- Data structure specifications
- Technology stack justification

---

### 3. Developer

**Responsibilities:**
- Implement the solution based on architectural decisions
- Write clean, maintainable code
- Implement order queue with VIP/Normal priority
- Implement bot lifecycle management (create, process, destroy)
- Ensure order numbers are unique and incrementing
- Handle bot state transitions (IDLE ↔ PROCESSING)
- Implement order repositioning when bot is removed

**Implementation Guidelines:**
- Keep it simple and clean (1-hour target)
- Focus on core functionality first
- Add comments only where logic is non-obvious
- Follow language-specific best practices
- Ensure code is testable

**Key Implementation Details:**
- Order submission: Normal orders queue behind VIP orders
- Bot processing: Pick up order from queue, process for 10 seconds, move to COMPLETED
- Bot removal: Stop processing if active, return order to original queue position
- No data persistence: All state in memory

**Deliverables:**
- Working implementation (frontend or backend)
- Source code with proper structure
- Scripts (for backend): `test.sh`, `build.sh`, `run.sh` in `script/` directory
- `result.txt` with CLI output including timestamps (backend only)

---

### 4. QA Engineer / Tester

**Responsibilities:**
- Create comprehensive test cases covering all requirements
- Execute unit tests and integration tests
- Verify all functional requirements are met:
  - Normal order submission and queueing
  - VIP order submission with priority
  - Bot addition and immediate processing
  - Bot removal and order repositioning
  - Order number uniqueness and incrementing
  - Bot IDLE state when no orders available
  - 10-second processing time per order
- Validate timestamp formatting in output (backend)
- Ensure all tests pass before submission

**Test Coverage:**
- Unit tests for order queue logic
- Unit tests for bot lifecycle management
- Unit tests for priority handling (VIP vs Normal)
- Integration tests for complete workflows
- Edge cases: multiple bots, rapid order submission, bot removal during processing

**Deliverables:**
- Test cases document
- Unit test suite
- Test execution results
- Bug reports (if any)

---

## Workflow

### Phase 0: Coordination (Collaborator)
- Assign roles and tasks to each agent
- Establish communication channels and context sharing
- Set up initial project structure and guidelines
- Review requirements and create initial task breakdown

### Phase 1: Planning (Product + Architect)
1. Review requirements in `se-take-home-assignment/README.md`
2. Decide implementation approach (frontend or backend)
3. Architect designs system structure
4. Product defines acceptance criteria
5. Collaborator reviews and approves the plan

### Phase 2: Implementation (Developer)
1. Set up project structure
2. Implement core order queue with priority
3. Implement bot management system
4. Implement user interactions (frontend) or CLI commands (backend)
5. Create required scripts (backend only)
6. Collaborator monitors progress and provides guidance

### Phase 3: Testing (QA + Developer)
1. Write and execute unit tests
2. Perform integration testing
3. Verify all requirements are met
4. Fix any bugs found
5. Collaborator validates test coverage

### Phase 4: Documentation (All Roles)
1. Document architecture decisions
2. Document API/CLI usage
3. Document deployment steps (if applicable)
4. Create README with setup and usage instructions
5. Collaborator compiles final documentation

### Phase 5: Submission
1. Ensure all tests pass
2. Create Pull Request following GitHub Flow
3. Verify GitHub Actions checks pass
4. Deploy frontend (if applicable) or verify CLI output (backend)
5. Collaborator final review and sign-off

---

## Technical Guidelines

### General
- Keep it simple and clean
- Focus on meeting requirements, not over-engineering
- Ensure you understand every line of code you write
- Use meaningful variable and function names
- Follow consistent code style

### Backend Specific (Go or Node.js)
- Implement CLI with clear command structure
- Print all output to `result.txt`
- Include timestamps in `HH:MM:SS` format for order completion
- Create `script/test.sh`, `script/build.sh`, `script/run.sh`
- Ensure tests run successfully in GitHub Actions
- Interactive CLI is required for next interview round

### Frontend Specific
- Choose a simple, well-known framework
- Deploy to a public URL (Vercel, Netlify, GitHub Pages, etc.)
- Ensure UI clearly demonstrates all features
- Provide clear interaction for order submission and bot management

---

## Success Criteria

**Collaborator Verification:**
- [ ] All agents have clear, assigned tasks
- [ ] Phase transitions are smooth with no information loss
- [ ] Timeline is maintained with appropriate buffer time
- [ ] Final deliverable meets all requirements

**Project Requirements:**
✅ All requirements from `se-take-home-assignment/README.md` are implemented
✅ Orders are queued with correct VIP/Normal priority
✅ Bots can be added and removed dynamically
✅ Each bot processes 1 order at a time (10 seconds)
✅ Order numbers are unique and incrementing
✅ All tests pass
✅ Code is clean and understandable
✅ Documentation is complete
✅ Pull Request submitted with passing GitHub Actions checks
✅ Prototype is functioning and ready for demonstration

---

## Time Management

- **0-15 min**: Planning and architecture design
- **15-45 min**: Core implementation
- **45-55 min**: Testing and bug fixes
- **55-60 min**: Documentation and final review

Focus on completing a working prototype rather than perfect code. Clean code is important, but functionality is paramount.
