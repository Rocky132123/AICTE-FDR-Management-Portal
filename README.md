AICTE Security Deposit & FDR Management Portal

Prototype / demonstration project for managing institutional Fixed Deposit Receipt (FDR) records, verification workflows, maturity tracking, compliance information, and audit-related review.

This project demonstrates how an institution-facing portal could bring FDR-related information and workflows into one interface. It is not an official AICTE service and does not, by itself, provide authoritative bank verification or approve the release of funds.

Table of Contents

1. Project Overview

2. Problem Statement

3. Objectives

4. Main Features

5. Technology Stack

6. Requirements

7. Project Structure

8. Setup and Execution

9. Firebase Configuration

10. Application Workflow

11. Feature-by-Feature Explanation

12. Demo Walkthrough

13. Sample Data and Validation

14. Build and Quality Checks

15. Environment Variables and Security

16. Current Prototype Limitations

17. Future Enhancements

18. Troubleshooting

19. Disclaimer

1. Project Overview

The AICTE Security Deposit & FDR Management Portal is a web application prototype intended to organise records associated with institutional security deposits and Fixed Deposit Receipts.

It provides a dashboard for viewing deposit summaries, searching and filtering FDR records, reviewing verification information, monitoring maturity dates, and navigating renewal, release, compliance, and audit-related workflows.

What is an FDR?

An FDR (Fixed Deposit Receipt) is a document issued by a bank that records details of a fixed deposit. Where the applicable rules require it, an institution may submit an FDR as financial security. The institution obtains the FDR from the bank; it does not issue the bank's FDR itself.

Example

Suppose a college has a security deposit of ₹25 lakh. The portal can be used to record the instrument reference, institution, amount, issue date, maturity date, and available verification information. An authorised reviewer can then inspect the record and track any required follow-up.

2. Problem Statement

FDR and compliance information can be difficult to track when it is distributed across spreadsheets, documents, email threads, and separate manual processes. Common challenges include:

Finding a specific instrument or institution record.

Reviewing incomplete or inconsistent information.

Tracking approaching maturity dates.

Identifying records that need attention.

Following renewal or release requests.

Reviewing institutional compliance information and available audit history.

The portal aims to make these tasks easier by presenting related information and workflows in a central dashboard.

3. Objectives

Provide a central interface for FDR records.

Make records easier to search, inspect, and filter.

Highlight records classified as active, flagged, approaching maturity, or matured.

Support review of available verification information.

Provide navigation for renewal, release, compliance, and audit workflows.

Support batch CSV import and export where implemented.

Provide an AI-assisted help interface where supported by the current application.

Make the prototype easier to demonstrate and evaluate.

4. Main Features

Dashboard overview

Summary cards display an overview of the deposit records and categories currently represented in the application.

Central FDR registry

A table-based view for locating and inspecting FDR records.

Search and filters

Search and filter controls help users narrow the displayed records by available fields or statuses.

FDR registration

A form-based workflow for entering the details required by the application.

Verification Desk

A dedicated area for reviewing FDR information and records that may require further attention.

Renewal & Release

Navigation for reviewing maturity-related follow-up and release-request workflows.

Institutional compliance checklist

A dashboard area for viewing the compliance items and scores represented by the prototype.

Audit Ledger and Audit Dossier

Audit-related views or document-generation actions, depending on the functionality enabled in the current build.

Batch CSV import and export

CSV tools for working with multiple records. Imports are subject to the application's required headers, field validation, duplicate checks, and approved-institution directory checks.

AI Assistant

An AI-assisted interface intended to help users understand information or workflows supported by the implementation.

Important: A visible button or status label does not prove that an external bank, SFMS, or government service is connected. Explain external integrations only when they have been implemented and tested.

5. Technology Stack

The project files indicate the following core technologies:

Frontend: React

Language: TypeScript

Build tool and development server: Vite

Authentication / data services: Firebase Authentication and Cloud Firestore are used by the project

Document processing: Tesseract.js and PDF.js are included for OCR/PDF-related workflows

UI: Reusable React components and project-specific styling

Check package.json for the exact dependency versions installed in your copy of the project.

6. Requirements

Software requirements

Windows 10/11, macOS, or Linux

Node.js LTS version compatible with the installed Vite and project dependencies

npm, included with Node.js

Git (optional for local execution; required for Git-based version control)

Visual Studio Code or another editor

A modern browser such as Chrome, Edge, or Firefox

A Firebase project if you want to test Firebase-backed features

Hardware requirements

A typical development computer with a modern processor, at least 4 GB RAM (8 GB or more recommended), and enough disk space for Node.js dependencies and the project.

Accounts / configuration

A GitHub account if you want to push the project to GitHub.

A Firebase project configured for the application's Authentication and Firestore usage.

Google sign-in enabled in Firebase Authentication if the application uses that provider.

7. Project Structure

The project contains files and folders similar to the following. Your exact structure may change as the project evolves.

aicte-fdr-portal-ai-features-fixed/
├── public/                       # Static assets
├── src/
│   ├── App.tsx                   # Main application and top-level state
│   ├── components/               # Dashboard and workflow components
│   │   ├── AIAssistant.tsx
│   │   ├── AuditTrailView.tsx
│   │   ├── FdrDetailModal.tsx
│   │   ├── FdrTable.tsx
│   │   ├── MetricsOverview.tsx
│   │   ├── Navbar.tsx
│   │   ├── RenewalReleaseDesk.tsx
│   │   ├── SubmissionForm.tsx
│   │   ├── VerificationDesk.tsx
│   │   ├── BatchCsvImportModal.tsx
│   │   └── ComplianceChecklist.tsx
│   └── logic/                    # CSV and other application logic, if present
├── .env.example                  # Environment variable template
├── .gitignore                    # Files excluded from Git
├── SETUP-FIREBASE.md             # Firebase setup notes
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts

Use the actual folders and filenames in your local copy as the source of truth.

8. Setup and Execution

Step 1: Install Node.js

Install a supported Node.js LTS release from the official Node.js website:

https://nodejs.org/

After installation, open PowerShell and check:

node --version
npm --version

Both commands should print version numbers.

Step 2: Open the project folder

In PowerShell, navigate to the project directory. For the current local setup:

cd "C:\Users\Asus\Downloads\aicte-fdr-portal-ai-features-fixed"

If you downloaded or cloned the project to another location, use that path instead.

Step 3: Install dependencies

npm install

Wait for npm to finish. If installation fails, read the first error carefully and resolve it before continuing.

Step 4: Configure environment variables

Review .env.example and SETUP-FIREBASE.md. Create a local .env.local file containing the environment variables expected by the project.

Do not copy secret values into this README or commit your .env.local file.

Step 5: Start the development server

npm run dev

Vite prints a local URL, commonly:

http://localhost:5173/

Open the exact URL printed by the terminal in your browser.

Keep the terminal running while using the development site. Stop the server with Ctrl+C.

Step 6: Test the dashboard

Open the dashboard.

Inspect the summary cards and FDR registry.

Test search and available filters.

Open a record using its Inspect action.

Test registration, verification, compliance, renewal/release, and audit-related areas that are enabled in the current build.

Test CSV import with a file matching the exact schema required by the importer.

Test OCR/PDF upload using clearly labelled synthetic demo documents only.

9. Firebase Configuration

Firebase is used by the project for authentication and Firestore-related functionality. The exact configuration must match the code and Firebase console settings.

General setup

Open the Firebase Console: https://console.firebase.google.com/

Create or select a Firebase project.

Register a web application in that project.

Copy the web-app configuration values required by the project.

Enable the authentication provider used by the application, such as Google sign-in, if needed.

Create/configure the Firestore database expected by the application.

Configure Firestore security rules before using real or sensitive data.

Add the local and deployed domains to the authorised domains list when required.

Put the configuration values in .env.local using the variable names expected by src/lib/firebase.ts and .env.example.

The project has used VITE_FIREBASE_* environment variable names. Check .env.example and the Firebase initialization file for the exact names and required fields.

After changing environment variables, stop and restart the Vite development server.

Important Firebase notes

Client-side Firebase configuration is not a substitute for Firestore security rules.

Never commit service-account private keys or other private credentials.

Do not expose sensitive personal, financial, or institutional data in a public demo database.

If Firestore reports that the database does not exist, confirm that Firestore has been created in the selected Firebase project and that the app is using the correct project configuration.

If Google sign-in fails, check that the provider is enabled and that the current domain is authorised.

See SETUP-FIREBASE.md for project-specific instructions.

10. Application Workflow

The intended end-to-end workflow can be explained using a fictional college with a ₹25 lakh FDR.

Step 1: Register

The institution or relevant user enters the FDR information using the registration workflow.

Typical information includes the instrument reference, institution, bank, amount, issue date, maturity date, and supporting evidence. The exact fields are determined by the form.

Step 2: Validate and store

The application validates required fields and, where implemented, checks for duplicate instrument numbers and whether the institution is present in the approved directory.

A CSV import can fail if required headers are missing, issue dates are empty, the FDR number already exists, or the institution ID is not registered.

Step 3: Review verification information

The reviewer examines the recorded information and available evidence. A discrepancy can be flagged for follow-up.

A status label alone is not proof that a bank independently confirmed the instrument.

Step 4: Monitor the record

The registry and dashboard categories help users find active records, flagged issues, approaching maturity dates, and matured deposits.

Step 5: Review renewal or release

If the deposit approaches maturity or a release request is submitted, the relevant workflow can be used to track review and follow-up.

Maturity does not automatically approve a release.

Step 6: Review compliance

The compliance checklist and verification matrix present the compliance information represented in the application for the selected institution.

Step 7: Inspect audit-related information

Users can review the audit information and documents generated by the current implementation.

Workflow summary

Register FDR
    ↓
Validate required fields and institution reference
    ↓
Store / display record
    ↓
Review verification information
    ↓
Monitor status and maturity
    ↓
Review renewal or release request, if applicable
    ↓
Inspect available audit and compliance information

This describes the intended workflow. Some steps may be demo-only or simulated in the current prototype.

11. Feature-by-Feature Explanation

Feature

What it is for

Example

Summary cards

Quick portfolio overview

See how many records are flagged

Central FDR registry

View and inspect instrument records

Find a college's FDR

Search

Locate records by supported fields

Search by FDR number

Status filters

Narrow the displayed records

View records approaching maturity

Register FDR

Enter a new instrument record

Record a sample ₹25 lakh FDR

Verification Desk

Review evidence and discrepancies

Investigate a date mismatch

AI Assistant

Provide AI-assisted guidance supported by the app

Ask how to interpret a field

Renewal & Release

Track relevant follow-up workflows

Review a pending release request

Compliance checklist

Review tracked institutional filings

Inspect the selected institution

Audit Ledger

View available recorded activity

Review a record's history

Batch CSV import

Add multiple records from a compatible CSV

Import a prepared test file

Export CSV

Export available records

Analyse data in a spreadsheet

Audit Dossier PDF

Generate an audit-related document if enabled

Export a record summary

OCR/PDF processing

Extract text or fields from supported documents

Test extraction from a demo PDF

12. Demo Walkthrough

For a short project demonstration, follow this order:

Introduce the problem: FDR records and follow-up can be difficult to manage across separate processes.

Show the dashboard: Explain the summary cards.

Show the registry: Search for a known demo record.

Inspect a record: Explain its reference, institution, amount, dates, and displayed status.

Show verification: Demonstrate the review workflow and explain how a flagged discrepancy is represented.

Show maturity monitoring: Explain how upcoming and matured records are presented.

Show compliance: Select an institution and explain the displayed checklist and matrix.

Show renewal/release: Demonstrate the workflow available in the current build.

Show AI/OCR: Use one specific, working example.

Close with the benefit: Centralised records, easier search, clearer follow-up, and improved visibility.

Suggested presentation statement

Our project is a prototype for managing institutional FDR records and related workflows. The dashboard brings records, verification review, maturity monitoring, compliance information, and audit-related views into one interface. For example, if a college has an FDR approaching maturity, an officer can locate the record and review the next action. The current prototype demonstrates the interface and supported workflows; authoritative bank verification and official approval require the appropriate external systems and controls.

13. Sample Data and Validation

Use synthetic demo data for presentations and testing. Do not use real institutional financial information in a public repository.

CSV import checks

The importer may validate:

Required column headers.

Required fields, including issue date.

Date formats such as YYYY-MM-DD or DD/MM/YYYY, as required by the importer.

Duplicate FDR/instrument numbers.

Institution IDs against the application's approved institution directory.

Amount and status formats.

Use the exact CSV template generated by the application's own Load Sample Data or template feature when available. Do not assume that arbitrary column names will be accepted.

If an import fails, inspect the per-row error messages and compare the CSV headers with the code in src/logic/csvBatchImport.ts and the UI in src/components/BatchCsvImportModal.tsx, if those files exist in your current version.

OCR sample documents

Use only clearly marked synthetic documents for OCR testing. OCR extracts text; extraction alone does not prove that a document is genuine.

14. Build and Quality Checks

Run the following commands from the project root.

Start development server

npm run dev

Run lint checks, if the script exists

npm run lint

Build for production, if the script exists

npm run build

A successful production build checks that the application can be compiled. It does not by itself prove that all UI workflows, authentication, security rules, or external integrations work correctly.

Check the scripts section of package.json for the commands supported by your version.

15. Environment Variables and Security

Before pushing the project to GitHub, check that .gitignore excludes local environment files and generated dependencies.

A typical .gitignore includes:

node_modules/
dist/
.env
.env.local
.env.*
!.env.example

Keep .env.example limited to variable names and safe placeholders.

Security checklist

Do not commit .env.local.

Do not commit Firebase service-account keys or private credentials.

Configure Firestore security rules for the intended access model.

Enforce authorisation in trusted backend/security rules, not only by hiding buttons in the frontend.

Avoid real personal, banking, or institutional data in demo records.

Do not represent a simulated verification response as a real bank confirmation.

Protect audit records against unauthorised changes in a production system.

16. Current Prototype Limitations

The application should be evaluated according to what is actually implemented and tested.

Potential prototype limitations to verify before presenting include:

Some records may be synthetic or seeded demo data.

Some verification actions may be simulated rather than connected to a bank or SFMS service.

A role selector does not, by itself, enforce permissions.

A displayed compliance score is only as reliable as its underlying data and formula.

Authentication visibility and protected-action enforcement must be tested separately.

CSV import depends on exact headers and valid institution IDs.

OCR may misread text and requires review.

A generated PDF or audit view is not automatically a legally certified report.

Do not claim live bank integration, official AICTE deployment, legally authoritative compliance scoring, or guaranteed document authenticity unless these are independently implemented and verified.

17. Future Enhancements

Possible future improvements include:

Authorised bank verification integrations, subject to access and agreements.

Strong server-side role-based access control.

More robust audit logging with protected, timestamped events.

Notifications for upcoming maturity dates.

Clear validation reports for failed CSV rows.

Better document extraction with human review and confidence indicators.

Automated tests for registration, filtering, CSV validation, and workflow transitions.

Accessibility and usability improvements.

Secure deployment configuration and monitoring.

Documented compliance scoring rules backed by authoritative requirements.

18. Troubleshooting

npm is not recognised

Install Node.js LTS, close and reopen PowerShell, then run node --version and npm --version.

Dependencies fail to install

Check the Node.js version and npm error output. Run npm install from the directory containing package.json.

Vite page does not open

Run npm run dev and open the exact local URL printed in the terminal.

Firebase configuration error

Check .env.local, compare its variable names with .env.example and src/lib/firebase.ts, and restart the development server after changing environment values.

Firestore database error

Confirm that Firestore has been created in the correct Firebase project and that the app is using the intended project configuration.

Google sign-in fails

Confirm the provider is enabled in Firebase Authentication and that the local or deployed domain is authorised.

CSV records fail

Use the application's own sample/template generator. Read each row's validation message. Confirm required headers, issue date, unique FDR number, and institution ID registration.

Git says remote origin already exists

Check the current remote:

git remote -v

Update it if needed:

git remote set-url origin https://github.com/YOUR-USERNAME/AICTE-FDR-Management-Portal.git

Replace YOUR-USERNAME with the repository owner's actual username.

Push to GitHub

git add .
git status
git commit -m "Describe your changes"
git push

If this is the first push and the upstream is not configured:

git push -u origin main

Before staging or committing, confirm that local environment files and credentials are excluded.

19. Disclaimer

This repository describes a prototype intended for learning, demonstration, and workflow evaluation. It is not an official AICTE service, a bank-issued FDR system, or a source of authoritative financial verification.

Use fictional data for demonstrations. Any real-world deployment would require appropriate authorisation, reliable integrations, security controls, privacy protections, operational monitoring, and validation against applicable regulations and institutional requirements.

Repository

GitHub repository: https://github.com/Rocky132123/AICTE-FDR-Management-Portal