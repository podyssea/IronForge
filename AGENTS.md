
# AGENTS.md — IronForge

## 1. Project Overview

IronForge is a native iOS gym and workout logging application built using Xcode and Swift.

Its purpose is to help users track workouts, log exercises, monitor strength progression, review training history, and improve consistency in the gym.

The application should be fast, intuitive, reliable, and optimized for use during workouts.

AI agents must behave as experienced senior iOS engineers with expertise in Swift, SwiftUI, software architecture, and fitness tracking applications.

Prioritize correctness, maintainability, performance, and excellent user experience.

## 2. Technology Stack

- Platform: iOS
- IDE: Xcode
- Language: Swift
- UI: SwiftUI, where applicable
- Architecture: Follow existing patterns; prefer MVVM when appropriate
- Concurrency: Swift async/await
- Persistence: Follow existing implementation; SwiftData where appropriate
- Dependency Management: Swift Package Manager
- Testing: XCTest / Swift Testing

Always inspect the existing project before introducing new technologies.

Do not replace existing frameworks without justification.

## 3. Core Engineering Principles

- Write clean, readable, maintainable Swift code.
- Follow SOLID principles where applicable.
- Prefer simple solutions over unnecessary abstractions.
- Avoid duplicated business logic.
- Keep components small and focused.
- Use descriptive naming conventions.
- Prefer immutable data where appropriate.
- Avoid force unwrapping.
- Handle errors explicitly.
- Respect existing architectural decisions.
- Never refactor unrelated code without a clear reason.

## 4. Application Architecture

Respect the existing project structure.

For new functionality, prefer separating responsibilities into:

### Views
- Display workout information.
- Handle user interactions.
- Present loading, empty, and error states.
- Avoid complex business logic.

### ViewModels
- Manage presentation state.
- Coordinate user actions.
- Handle validation and interaction with services.
- Use appropriate main-actor isolation for UI state.

### Models
Represent domain entities such as:

- Exercise
- Workout
- WorkoutSession
- WorkoutSet
- ExerciseHistory
- PersonalRecord
- WorkoutTemplate

These are conceptual entities, not mandatory new classes.

Reuse existing models whenever possible.

### Services
Handle responsibilities such as:

- Workout persistence
- Exercise management
- Workout history
- Personal record calculations
- Data import/export when implemented

Do not create unnecessary services or protocols.

## 5. Workout Logging Requirements

Workout logging is the application's primary responsibility.

Prioritize fast and reliable interactions.

### Exercise Logging

Support the existing application's exercise tracking capabilities.

Where implemented, exercises may contain:

- Exercise name
- Muscle group
- Equipment
- Sets
- Repetitions
- Weight
- Notes

Do not introduce additional fields without considering existing data models and compatibility.

### Set Logging

- Make entering weight and repetitions efficient.
- Preserve logged values accurately.
- Avoid accidental data loss.
- Support editing and deleting sets.
- Validate numeric input.
- Prevent invalid values from corrupting stored data.
- Never silently overwrite completed workout data.

### Workout Sessions

- Preserve active workout state.
- Prevent accidental workout termination.
- Maintain correct exercise and set ordering.
- Ensure completed workouts are stored reliably.
- Avoid duplicate sessions caused by repeated actions.
- Handle app backgrounding and interruptions appropriately.

### Workout History

- Display historical workout information accurately.
- Preserve original workout dates.
- Keep completed sessions separate from active sessions.
- Ensure historical records remain consistent after edits.
- Avoid modifying historical data unintentionally.

## 6. Strength Progression and Personal Records

IronForge should provide reliable progression tracking.

When implementing strength-related calculations:

- Use consistent measurement units.
- Distinguish kilograms and pounds.
- Avoid floating-point comparison errors where precision matters.
- Handle missing or incomplete data safely.
- Do not treat warm-up sets as working sets unless intended.
- Do not assume all exercises use the same progression rules.
- Avoid counting deleted or invalid sets.
- Keep calculations deterministic and testable.

Potential metrics include:

- Maximum lifted weight
- Maximum repetitions at a given weight
- Total training volume
- Estimated one-repetition maximum
- Exercise frequency
- Workout consistency

Only implement metrics when requested or already supported.

Document formulas and assumptions for calculated metrics.

Never present estimated values as measured results.

## 7. Data Integrity and Persistence

Workout data is valuable user-generated information.

Protect it carefully.

- Never delete workout history without explicit user confirmation.
- Avoid destructive database migrations.
- Preserve data when models evolve.
- Handle incomplete workout sessions safely.
- Prevent duplicate persistence operations.
- Validate data before saving.
- Use stable identifiers for persisted entities.
- Preserve relationships between workouts, exercises, and sets.
- Ensure edits update the intended records only.
- Do not reset local storage during development without approval.

When changing persistence models, assess migration requirements first.

## 8. Swift and SwiftUI Standards

- Use modern Swift supported by the deployment target.
- Prefer `struct` for value types.
- Prefer `let` where possible.
- Use appropriate access control.
- Follow Swift concurrency isolation rules.
- Use `@MainActor` for UI-bound state.
- Prefer async/await for asynchronous operations.
- Avoid blocking the main thread.
- Use the state-management approach appropriate for the project's deployment target.
- Keep SwiftUI views focused.
- Extract reusable components when beneficial.
- Avoid expensive calculations inside view bodies.
- Keep previews functional where practical.

## 9. UI/UX Guidelines

IronForge is designed for frequent interaction during gym sessions.

The interface must be:

- Fast
- Clear
- Consistent
- Accessible
- Easy to operate with one hand

### Workout Experience

- Minimize taps required to log a set.
- Make weight and repetition inputs easy to access.
- Clearly distinguish completed and incomplete sets.
- Provide immediate feedback after logging.
- Avoid unnecessary confirmation dialogs.
- Prevent accidental destructive actions.
- Keep active workout information accessible.
- Use readable typography and appropriately sized touch targets.

### Visual Design

- Follow Apple Human Interface Guidelines.
- Support dark mode where appropriate.
- Maintain consistent spacing and typography.
- Use SF Symbols when suitable.
- Respect safe areas.
- Support Dynamic Type.
- Use accessible contrast.
- Keep animations subtle and purposeful.
- Ensure compatibility with supported iPhone screen sizes.

Avoid redesigning existing screens unless requested.

## 10. Performance

- Keep workout logging responsive.
- Avoid unnecessary SwiftUI updates.
- Use lazy containers for long exercise lists.
- Avoid expensive calculations on the main thread.
- Optimize history queries where necessary.
- Avoid unnecessary database writes.
- Handle large workout histories efficiently.
- Avoid memory leaks and retain cycles.

Prioritize measurable improvements over premature optimization.

## 11. Security and Privacy

- Treat workout history as private user data.
- Never log sensitive personal information unnecessarily.
- Never hardcode API keys or credentials.
- Use Keychain for credentials when required.
- Request only necessary device permissions.
- Do not introduce analytics or tracking without approval.
- Do not transmit workout data to external services without an explicit feature requirement.
- Follow Apple's privacy and security guidelines.

## 12. Testing Requirements

Add or update relevant tests for meaningful changes.

Prioritize:

- Workout creation
- Exercise addition and removal
- Set logging and editing
- Workout completion
- Workout history persistence
- Personal record calculations
- Training volume calculations
- Unit conversions
- Input validation
- Data migration behavior

Test edge cases such as:

- Empty workouts
- Zero-weight exercises
- Bodyweight exercises
- Incomplete sets
- Interrupted sessions
- Duplicate completion actions
- Deleted exercises
- Missing historical data

Never claim tests passed unless they were executed.

## 13. AI Agent Workflow

### Before Making Changes

1. Inspect relevant project files.
2. Understand existing architecture.
3. Identify affected models and services.
4. Consider persistence implications.
5. Choose the smallest safe implementation.

### During Implementation

- Make focused changes.
- Reuse existing components.
- Preserve existing functionality.
- Avoid speculative features.
- Avoid unrelated refactoring.
- Keep business logic testable.
- Maintain compatibility with existing data.
- Do not introduce dependencies without justification.

### After Implementation

1. Review the changes.
2. Check for logical errors.
3. Build the project when Xcode tooling is available.
4. Run relevant tests when possible.
5. Review persistence and migration risks.
6. Summarize the implementation.

## 14. Xcode Project Management

- Respect existing folder structure.
- Preserve signing configurations.
- Do not change bundle identifiers.
- Do not change deployment targets without approval.
- Do not modify provisioning profiles or entitlements without approval.
- Avoid unnecessary project configuration changes.
- Keep file naming consistent.
- Do not modify generated files unnecessarily.

## 15. Git Guidelines

- Keep changes focused.
- Never discard uncommitted changes.
- Do not perform destructive Git operations.
- Do not commit or push without approval.
- Avoid unrelated formatting changes.
- Review diffs before completing tasks.

## 16. Prohibited Practices

AI agents must never:

- Delete workout history without authorization.
- Introduce destructive database changes without approval.
- Invent unavailable APIs.
- Add unnecessary dependencies.
- Duplicate existing functionality.
- Ignore compiler errors.
- Suppress errors without justification.
- Remove tests to make builds pass.
- Rewrite unrelated components.
- Claim unexecuted tests passed.
- Introduce speculative functionality.
- Expose sensitive user data.
- Modify signing or deployment settings without approval.

## 17. Communication Standards

After completing a task, respond concisely using:

### Changes
- What was implemented or modified.

### Validation
- Build and test results.
- Any checks that could not be performed.

### Notes
- Important technical decisions.
- Known limitations.
- Data migration concerns, if applicable.

Avoid unnecessarily long explanations.

## 18. Primary Directive

Always prioritize:

1. Workout data integrity
2. Correctness
3. Existing functionality
4. Fast workout logging
5. Maintainability
6. Native iOS user experience
7. Performance
8. Simplicity


## iOS Automatic Build, Signing, and Deployment

IronForge is deployed to a personal iPhone using a free Apple Developer account (Personal Team).

Every successful code change must be followed by building, signing, and deploying the updated application to the connected iPhone.

### Mandatory Workflow After Every Code Change

1. Complete the requested code changes.
2. Review the modified files for errors.
3. Build IronForge using Xcode.
4. Resolve any compilation errors.
5. Use automatic signing with the existing Personal Team.
6. Refresh development provisioning when required.
7. Install the updated application on the connected iPhone.
8. Launch the application and verify successful deployment.
9. Preserve all existing workout history and application data.
10. Report the build, signing, and deployment results.

### Signing Requirements

- Use the existing Apple Developer Personal Team.
- Preserve the existing bundle identifier.
- Keep automatic signing enabled where supported.
- Never modify signing certificates or entitlements unnecessarily.
- Never uninstall the existing application before deployment.
- Never erase or reset application data.
- Never require a paid Apple Developer account.
- Never introduce third-party signing services.

### 7-Day Free Developer Provisioning

- Free Apple Developer provisioning typically expires after 7 days.
- Every deployment must use valid development signing.
- Refresh provisioning when necessary during deployment.
- Successfully reinstalling the updated app with renewed provisioning should refresh its usable signing period.
- Never claim the 7-day period was renewed without confirming successful installation with valid provisioning.
- Do not attempt to bypass Apple's signing restrictions.

### Deployment Rules

- Deployment is mandatory after every code modification when the Mac, Xcode, and iPhone are available.
- Prefer deploying directly to the connected physical iPhone rather than only the simulator.
- Preserve the existing application installation and local data.
- If deployment fails, investigate and report the error.
- Never silently skip deployment.
- If the device is unavailable, report that deployment is pending.
- Do not claim deployment succeeded unless it was verified.

### Primary Directive

Every completed code change must result in an updated, successfully signed IronForge application installed on the connected iPhone whenever the development environment permits.

A successful build alone does not constitute task completion when physical-device deployment is available.


IronForge must remain stable, reliable, and easy to use during real gym sessions.

Every change should improve the application without compromising existing workout data or functionality.

The AI agent must act as a responsible senior iOS engineer, not merely a code generator.


