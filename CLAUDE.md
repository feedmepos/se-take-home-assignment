# Clean Code: Modular Architecture Guidelines
we follow a **Modular Approach**. This means every feature should exist as a self-contained unit of logic.

## 1. The Single Responsibility Principle (SRP)
Each module and file should have **one reason to change**.
* **Controllers:** Handle request parsing and response routing only.
* **Services:** House the "heavy lifting" (business logic, DB queries).

## 2. File Naming & Structure
We use the **Feature-Driven** structure. Keep related files together rather than grouping by file type across the whole app.

# File Convention
All files must follow the **feature.role.extension** pattern to ensure consistency and easy searching.

`[name].[role].[extension]`

* **Lowercase:** Use lowercase only (e.g., `user`, not `User`).
* **Kebab-case:** Use dashes for multiple words (e.g., `auth-token.service.ts`).
* **Dots:** Use dots `.` only to separate the name, the role, and the extension.

# TDD Workflow: Red-Green-Refactor

We follow a **Test-Driven Development** approach to ensure our modular code is reliable, bug-free, and easy to refactor. No code should be written for a feature until a failing test exists.

## 1. The Three Laws of TDD
1. You may not write any production code until you have written a failing unit test.
2. You may not write more of a unit test than is sufficient to fail.
3. You may not write more production code than is sufficient to pass the currently failing test.

## 2. The Process

### Step 1: RED (Fail)
Create your `[feature].[role].spec.ts` file and write a test for the smallest possible requirement.
* Run the test.
* It **must fail** (usually because the method doesn't exist yet).

### Step 2: GREEN (Pass)
Write the **bare minimum** code in your `[feature].[role].ts` file to make the test pass.
* Do not worry about "clean code" yet.
* Just make the test turn green.

### Step 3: REFACTOR (Clean)
Now that you have a passing test, clean up the code.
* Remove duplication.
* Improve variable naming.
* Ensure it follows our **Modular Architecture** guidelines.
* Run tests again to ensure they stay green.

