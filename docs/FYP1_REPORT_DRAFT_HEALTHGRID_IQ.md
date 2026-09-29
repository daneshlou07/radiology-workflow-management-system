# UNIVERSITI TENAGA NASIONAL
## COLLEGE OF COMPUTING AND INFORMATICS

---

# HEALTHGRID IQ: A DIGITAL HEALTHCARE INFORMATION AND ASSISTANCE SYSTEM

**By:**  
**MUHAMMAD DANESH HAKIMI LOU BIN ABDULLAH**  
**Student ID: BSW01084693**  

**Project Supervisor:**  
**Dr. Siti Rohana binti Ahmad Molok**  

A Project Report Submitted to the College of Computing and Informatics, Universiti Tenaga Nasional in Partial Fulfilment of the Requirements for the Degree of  
**Bachelor of Computer Science (Software Engineering) (Honours)**  

**SEPTEMBER 2026**

---

## DECLARATION

I declare that this Final Year Project report entitled **“HealthGrid IQ: A Digital Healthcare Information and Assistance System”** is my own work. All quotations, summaries, and references taken from other sources have been properly cited and acknowledged.

I also declare that this report has not been submitted before to Universiti Tenaga Nasional or any other university for any degree or award.

\
**Signature:** ___________________________________  
**Student Name:** Muhammad Danesh Hakimi Lou bin Abdullah  
**Student ID:** BSW01084693  
**Date:** 28 September 2026  

---

## APPROVAL PAGE

This project report entitled:

**“HEALTHGRID IQ: A DIGITAL HEALTHCARE INFORMATION AND ASSISTANCE SYSTEM”**

submitted by:  
**MUHAMMAD DANESH HAKIMI LOU BIN ABDULLAH (BSW01084693)**  

in partial fulfilment of the requirements for the degree of  
**Bachelor of Computer Science (Software Engineering) (Honours)**  
at the College of Computing and Informatics, Universiti Tenaga Nasional, has been approved.

\
**Supervisor:** Dr. Siti Rohana binti Ahmad Molok  
**Signature:** ___________________________________  
**Date:** ___________________________________  

---

## ACKNOWLEDGMENTS

First of all, I would like to thank God for giving me the patience, health, and ability to complete this Final Year Project 1 report.

I would like to express my sincere gratitude to my supervisor, **Dr. Siti Rohana**, for all her guidance, advice, and feedback throughout this semester. Her feedback helped me clarify my project scope and organize my report properly.

I would also like to thank the staff at **Klinik Kesihatan Bestari Jaya** for allowing me to observe their daily workflow and explaining how radiology referrals are handled in a real clinic. Their input helped me understand the actual problems with paper forms like the *Borang Permohonan Pemeriksaan Radiologi*, which inspired this project.

Lastly, I would like to thank my family and friends for their continuous support and encouragement throughout my studies.

---

## ABSTRACT

Medical imaging such as X-rays, ultrasound, and CT scans is very important in modern healthcare for diagnosing diseases and injuries. However, in many public health clinics (*Klinik Kesihatan*) in Malaysia, the process of requesting and managing imaging scans is still done manually on paper. During an initial observation at Klinik Kesihatan Bestari Jaya, it was found that doctors use a paper form called *Borang Permohonan Pemeriksaan Radiologi* to refer patients to district hospitals for scans. Because this process is manual, papers can get lost, handwriting can be hard to read, and clinic doctors have no way to track whether the scan was completed or whether the report is ready. To solve this problem, this project proposes **HealthGrid IQ**, a web-based system designed to digitalize and coordinate the radiology referral and reporting workflow between clinics and hospitals. The system allows Medical Officers to register patients and submit digital referral orders, Radiographers to view the schedule and upload scan images, Radiologists to review images and sign off reports, and Administrators to manage facilities and equipment. HealthGrid IQ also includes an assistive feature that generates a draft report to help radiologist documentation, and a distance-based scheduling helper using Open Source Routing Machine (OSRM) to suggest the nearest available imaging center when local machines are busy. The project follows the Agile Scrum methodology, starting with requirement analysis and system design in FYP 1, followed by prototype development and user testing in FYP 2. The system will be evaluated using black-box testing and the System Usability Scale (SUS) to ensure it is practical, easy to use, and helpful for healthcare staff.

**Keywords:** Healthcare Information System, Radiology Workflow, Clinic Referral, Assistive Reporting, Scheduling, Software Engineering.

---

## TABLE OF CONTENTS

- **DECLARATION**
- **APPROVAL PAGE**
- **ACKNOWLEDGMENTS**
- **ABSTRACT**
- **TABLE OF CONTENTS**
- **LIST OF TABLES**
- **LIST OF FIGURES**
- **LIST OF ABBREVIATIONS**

### CHAPTER 1: INTRODUCTION
- 1.1 Project Background
- 1.2 Problem Statement
  - 1.2.1 Missing Documents and Inefficiencies of Paper-Based Referrals
  - 1.2.2 Lack of Status Tracking and Long Waiting Times
  - 1.2.3 Difficulty in Finding and Scheduling Alternative Imaging Centers
- 1.3 Project Objectives
- 1.4 Project Scope
  - 1.4.1 Target Users
  - 1.4.2 Functional Scope
  - 1.4.3 Technical Scope
  - 1.4.4 Project Limitations (Out of Scope)
- 1.5 Significance of the Project
- 1.6 Report Organization

### CHAPTER 2: LITERATURE REVIEW
- 2.1 Introduction
- 2.2 Background of Healthcare Systems and Radiology Workflows
  - 2.2.1 How Radiology Referrals Work in Public Healthcare
  - 2.2.2 The Gap Between Primary Clinics and Hospitals
  - 2.2.3 Basic Concepts: RIS, PACS, and DICOM
- 2.3 Review of Existing Systems
  - 2.3.1 Teleprimary Care & Clinical Information System (TPC-OHCIS)
  - 2.3.2 Orthanc Open-Source PACS Server
  - 2.3.3 Commercial Hospital Radiology Systems (Karisma RIS)
- 2.4 Comparison of Existing Systems
  - 2.4.1 Comparison Table (Table 2.1)
  - 2.4.2 Discussion and Findings
- 2.5 Assistive Features and Scheduling Logic
  - 2.5.1 Structured Draft Reports and Doctor Verification
  - 2.5.2 Distance Calculation Using Haversine and OSRM
  - 2.5.3 Keeping the Human in Control (Ethics)
- 2.6 Project Gap
- 2.7 Chapter Summary

### REFERENCES

---

## LIST OF TABLES

- **Table 1.1:** Mapping of Problem Statements to Project Objectives
- **Table 1.2:** System Users and Their Main Functions
- **Table 2.1:** Comparison of Existing Systems with HealthGrid IQ

---

## LIST OF FIGURES

- **Figure 1.1:** Manual Paper Referral Process vs. HealthGrid IQ Digital Process
- **Figure 2.1:** Steps in a Typical Radiology Workflow

---

## LIST OF ABBREVIATIONS

| Abbreviation | Meaning |
| :--- | :--- |
| **API** | Application Programming Interface |
| **DICOM** | Digital Imaging and Communications in Medicine |
| **EMR** | Electronic Medical Record |
| **HIS** | Hospital Information System |
| **KK** | Klinik Kesihatan (Public Health Clinic) |
| **KKM** | Kementerian Kesihatan Malaysia (Ministry of Health Malaysia) |
| **MO** | Medical Officer (Doctor) |
| **NFR** | Non-Functional Requirement |
| **OSRM** | Open Source Routing Machine |
| **PACS** | Picture Archiving and Communication System |
| **RBAC** | Role-Based Access Control |
| **RIS** | Radiology Information System |
| **SPA** | Single-Page Application |
| **SRS** | Software Requirements Specification |
| **SUS** | System Usability Scale |
| **TPC-OHCIS** | Teleprimary Care - Oral Health Clinical Information System |
| **UI** | User Interface |

---
\pagebreak

# CHAPTER 1: INTRODUCTION

## 1.1 Project Background

In healthcare, diagnostic imaging such as X-rays, ultrasounds, and CT scans plays a major role in helping doctors identify illnesses and injuries. Getting these scans done and reviewed quickly is important because treatment decisions often depend on the radiologist’s report.

In Malaysia, public healthcare under the Ministry of Health (*Kementerian Kesihatan Malaysia*, KKM) is divided into clinics and hospitals. Primary health clinics (*Klinik Kesihatan*), such as **Klinik Kesihatan Bestari Jaya**, are usually the first place patients go when they feel sick. These clinics handle a large number of patients daily. However, most small clinics only have basic X-ray equipment or no imaging machines at all. Advanced machines like CT scans and MRI, as well as full-time Radiologists (specialist doctors who read scans), are only available at larger district or general hospitals, such as Hospital Tanjong Karang and Hospital Sungai Buloh.

During a visit and preliminary observation at **Klinik Kesihatan Bestari Jaya**, I noticed that the way doctors send patients for scans is still mostly done on paper. When a Medical Officer (MO) decides that a patient needs an X-ray or scan, the doctor has to fill in a physical paper form called the *Borang Permohonan Pemeriksaan Radiologi*. This form contains the patient’s details, IC number (MyKad), reasons for the scan, body part, and the type of scan needed. The patient or clinic staff then takes this paper to the hospital to book an appointment or get the scan done. After the scan is taken, the printed film or disc, along with a written report, is sent back to the clinic.

While paper forms are simple to use, they cause several real-world problems:
1. Physical papers can easily be misplaced, damaged, or delayed while being carried between clinic and hospital.
2. Doctor’s handwriting can sometimes be hard to read, which can cause confusion or require phone calls to clarify.
3. Once the patient leaves the clinic with the form, the clinic doctor has no way to track the case. The doctor cannot see whether the patient actually went to the hospital, whether the scan has been done, or when the report will be ready.
4. If a clinic's X-ray machine breaks down, clinic staff have to manually call other clinics or hospitals to see who has an open slot.

To help solve these daily issues, this project proposes **HealthGrid IQ: A Digital Healthcare Information and Assistance System**. 

HealthGrid IQ is a web-based system designed to replace the paper referral form with a clean digital workflow. It connects the four main roles involved in the imaging process: Medical Officers, Radiographers, Radiologists, and Administrators. Through the system, clinic doctors can register patients and submit referrals online, radiographers can view upcoming cases and upload scan images, radiologists can write and sign reports with the help of an assistive draft generator, and administrators can see the status of cases and find the nearest available facility using a distance-based scheduling helper. 

By keeping everything in one clear system, HealthGrid IQ makes the referral process faster, prevents lost forms, and lets doctors track their patient's scan status from start to finish.

---

## 1.2 Problem Statement

Based on the observation at Klinik Kesihatan Bestari Jaya, three main problems were identified:

### 1.2.1 Missing Documents and Inefficiencies of Paper-Based Referrals
Currently, clinics still rely on the physical paper form (*Borang Permohonan Pemeriksaan Radiologi*) to request scans. Using paper forms means information can easily be lost or delayed when patients travel from the clinic to the hospital. In addition, physical forms can have messy handwriting or missing information, which wastes time because staff have to call the clinic to verify details. Also, paper files can only be in one place at a time, meaning the clinic doctor and the hospital radiographer cannot view the case at the same time.

### 1.2.2 Lack of Status Tracking and Long Waiting Times
Right now, there is no system to track the status of a referral after the paper form is given to the patient. The referring clinic doctor does not know if the patient attended their appointment, if the scan is finished, or if the report is still being written. Radiologists in busy hospitals also have to handle many reports without an easy way to prioritize urgent cases. Because there is no digital tracking, patients often have to wait a long time just to get their results, and doctors have to make repeated calls to check on reports.

### 1.2.3 Difficulty in Finding and Scheduling Alternative Imaging Centers
When a clinic's imaging machine is down for maintenance or too busy, clinic staff have to find another nearby clinic or hospital that can take the patient. Right now, staff have to do this by calling around manually. This takes a lot of time and can lead to scheduling mistakes. There is no simple tool that shows which nearby facilities are open, what equipment they have, and how far away they are to help staff choose the best option quickly.

---

## 1.3 Project Objectives

The main goal of this project is to develop and evaluate **HealthGrid IQ**, a web-based system to improve the radiology referral, tracking, and scheduling process between clinics and hospitals. To directly address each of the three problems identified in the problem statement, the specific project objectives are:

1. **To design and develop a digital patient registration and referral module** that replaces the physical *Borang Permohonan Pemeriksaan Radiologi*, enabling clinic Medical Officers to create, store, and share digital imaging requests securely without the risk of lost or illegible paper documents (addresses Problem 1.2.1).
2. **To implement a real-time case tracking pipeline and an assistive reporting draft feature** that tracks case progress across four key stages (*Created*, *Scheduled*, *Scanned*, *Finalized*) and pre-populates standardized report templates to help radiologists complete reports faster (addresses Problem 1.2.2).
3. **To develop a distance-aware scheduling recommendation tool** using Open Source Routing Machine (OSRM) that assists administrators in finding and scheduling the nearest available imaging center and equipment when local clinic capacity is congested or unavailable (addresses Problem 1.2.3).

The direct alignment between each problem statement and its corresponding objective is summarized in Table 1.1:

**Table 1.1:** Mapping of Problem Statements to Project Objectives
| Problem Statement | Corresponding Project Objective | Expected Outcome |
| :--- | :--- | :--- |
| **1.2.1 Missing Documents and Inefficiencies of Paper-Based Referrals** | **Objective 1:** Design and develop a digital patient registration and referral module. | Complete replacement of the paper form (*Borang Radiologi*) with secure, centralized digital order entry. |
| **1.2.2 Lack of Status Tracking and Long Waiting Times** | **Objective 2:** Implement a real-time case tracking pipeline and assistive reporting draft feature. | Live visibility into the 4-step case lifecycle (*Created* $\rightarrow$ *Scheduled* $\rightarrow$ *Scanned* $\rightarrow$ *Finalized*) and faster report completion. |
| **1.2.3 Difficulty in Finding and Scheduling Alternative Imaging Centers** | **Objective 3:** Develop a distance-aware scheduling recommendation tool using OSRM. | Quick identification and booking of the nearest available facility with required equipment and open slots. |

*Note: Functional verification (black-box testing) and usability evaluation using the System Usability Scale (SUS) will be conducted across all three modules to evaluate overall system performance and user satisfaction.*

---

## 1.4 Project Scope

To ensure this project can be completed successfully within the final year timeframe, the project scope is defined as follows:

### 1.4.1 Target Users
HealthGrid IQ is designed for four main user roles, as shown in Table 1.2:

**Table 1.2:** System Users and Their Main Functions
| User Role | Who They Are | What They Do in HealthGrid IQ |
| :--- | :--- | :--- |
| **Medical Officer (Doctor)** | Clinic Doctor (*Klinik Kesihatan*) | Registers patients, creates digital scan referrals (choosing scan type, body part, urgency, and clinical notes), tracks referral progress, and views finalized reports. |
| **Radiographer** | Imaging Staff (Hospital / Clinic) | Views the daily list of scheduled scans, confirms when the patient arrives, takes the scan, uploads the image (JPEG/PNG), and marks the scan as completed. |
| **Radiologist** | Specialist Doctor | Views scans waiting for review (sorted by urgency), writes findings and impressions using an assistive draft template, and signs off the final report. |
| **Administrator** | Clinic / Hospital Admin Staff | Manages user accounts, clinics, and equipment status, and uses the scheduling helper to assign patients to the best nearby clinic. |

### 1.4.2 Functional Scope
The system prototype includes the following main features:
1. **Patient Registration:** Saves patient demographic information such as full name, IC number (MyKad), phone number, home address, and basic medical alerts.
2. **Digital Scan Referrals:** Replaces the paper *Borang Permohonan Pemeriksaan Radiologi* with a simple online form capturing scan type (X-Ray, Ultrasound, CT, MRI), body part, reason for scan, and urgency level (Routine, Urgent, Emergency).
3. **Case Status Tracking:** A clear 4-step status flow so everyone knows what stage a case is in:
   $$\text{Created} \longrightarrow \text{Scheduled} \longrightarrow \text{Scanned} \longrightarrow \text{Finalized}$$
4. **Assistive Draft Report Generator:** Automatically fills in a clean draft template with the patient's details, scan type, and reason for examination so the radiologist does not have to type everything from scratch.
5. **Distance-Based Scheduling Helper:** Uses the open-source OSRM routing tool to calculate estimated road distances and travel times between clinics, helping administrators suggest the nearest available center for a scan.

### 1.4.3 Technical Scope
* **Frontend:** Developed using React 18, TypeScript, and Tailwind CSS to create a clean, responsive web interface.
* **Backend & Database:** Uses Google Cloud Firestore (NoSQL database) for storing data in real-time and Firebase Authentication for user login.
* **Maps:** Uses Leaflet and Google Maps Platform to display map views and calculate driving routes, with Open Source Routing Machine (OSRM) as a secondary fallback.

### 1.4.4 Project Limitations (Out of Scope)
To keep the project realistic for an undergraduate student, the following items are intentionally out of scope:
* **No Automatic Medical Diagnosis:** The system will **not** diagnose patients automatically. The assistive report generator only creates a draft layout; a qualified human doctor must review and sign it.
* **Simulated Medical Image Viewer:** The system will not use a full multi-gigabyte hospital PACS hardware server. Instead, images are uploaded and viewed as standard high-resolution web formats (JPEG/PNG) in the browser.
* **No Direct Machine Hardware Control:** The system does not connect directly to the physical cables of X-ray or CT machines.
* **No Hospital Billing or Pharmacy:** Payment processing, insurance claims, and medicine dispensary are not included.

---

## 1.5 Significance of the Project

This project provides several practical benefits:
* **Saves Time for Clinics:** By replacing paper forms with online referrals, clinics can avoid lost documents and reduce the time spent calling hospitals to check on scan statuses.
* **Better Tracking for Doctors:** Clinic doctors can see exactly what is happening with their patients' scans in real time, leading to faster follow-up treatment.
* **Easier Scheduling:** When local machines are down, administrators can quickly see which nearby clinic has open slots and equipment, reducing long patient waiting times.
* **Good Learning Experience in Software Engineering:** This project demonstrates how modern web tools (React, TypeScript, Firebase) and open routing tools can be combined to solve real problems in Malaysian public healthcare.

---

## 1.6 Report Organization

This report is organized into five chapters:
* **Chapter 1 (Introduction):** Covers the background, problems found at Klinik Kesihatan Bestari Jaya, project objectives, scope, and significance.
* **Chapter 2 (Literature Review):** Reviews medical imaging workflows, compares three existing software systems, and discusses assistive reporting and scheduling logic.
* **Chapter 3 (System Requirements and Methodology):** Explains the Agile methodology, how requirements were gathered, and lists functional and non-functional requirements with use case diagrams.
* **Chapter 4 (System Design):** Shows the system architecture, database structure, UML sequence diagrams, and interface wireframes.
* **Chapter 5 (Implementation and Conclusion):** Discusses the prototype development, testing results, limitations, and future improvements.

---
\pagebreak

# CHAPTER 2: LITERATURE REVIEW

## 2.1 Introduction

This chapter reviews existing literature, healthcare concepts, and software systems related to this project. It is divided into four main parts:
1. An overview of how radiology referrals work and the main technologies used in medical imaging (RIS, PACS, and DICOM);
2. A review of three existing systems used in healthcare;
3. A comparison table showing how these systems compare with HealthGrid IQ; and
4. A discussion on assistive report drafting and distance-based scheduling.

---

## 2.2 Background of Healthcare Systems and Radiology Workflows

### 2.2.1 How Radiology Referrals Work in Public Healthcare
A radiology workflow is the series of steps that takes place from the moment a doctor decides a patient needs a scan until the final report is ready. As described by the European Society of Radiology (ESR, 2021), this process usually involves:
1. **Referral:** The doctor examines the patient and writes an imaging request.
2. **Review:** The imaging department checks if the requested scan is suitable for the patient.
3. **Scheduling:** The patient is booked for a specific date, time, and machine.
4. **Scanning:** The radiographer performs the scan and saves the images.
5. **Reporting:** The radiologist examines the images and writes the medical findings.
6. **Communication:** The report is sent back to the referring doctor so treatment can begin.

```
[Doctor]                [Radiographer]           [Radiologist]            [Doctor]
Creates Referral  --->  Performs Scan    --->    Reviews & Signs  --->    Views Report
& Enters Details        & Uploads Image          Draft Report             & Treats Patient
```
**Figure 2.1:** Steps in a Typical Radiology Workflow

In modern hospitals, these steps happen electronically. However, when referrals have to move between a rural health clinic and a district hospital, paper forms are often used, which slows down the entire process.

### 2.2.2 The Gap Between Primary Clinics and Hospitals
In Malaysia, health clinics (*Klinik Kesihatan*) handle general outpatient cases, while hospitals handle specialized care (Hasan et al., 2022). Most clinics do not have expensive machines like CT scanners or MRI machines, and they do not have full-time Radiologists on site. 

When a clinic doctor needs an advanced scan for a patient, the patient has to be referred to a hospital. Because these clinics and hospitals often use separate systems or rely on paper, patients have to carry physical referral forms (*Borang Permohonan Pemeriksaan Radiologi*) by hand. Studies have shown that this manual handoff leads to long waiting times, lost records, and cases where patients fail to show up for their scans (Che Mohamed et al., 2021).

### 2.2.3 Basic Concepts: RIS, PACS, and DICOM
In digital radiology, three main terms are commonly used:
* **Radiology Information System (RIS):** Software that handles the administrative work in an imaging department, such as registering patients, scheduling appointments, and tracking case statuses (Pianykh, 2020).
* **Picture Archiving and Communication System (PACS):** A storage and viewing system specifically built to store and display medical images on computers, replacing old physical film sheets.
* **DICOM (Digital Imaging and Communications in Medicine):** The international standard file format used for medical images. A DICOM file contains both the scan picture and details about the patient and machine settings.

While big hospitals have full RIS and PACS systems, these systems are expensive, complex, and installed inside hospital local networks. They are not built for small community clinics to easily send referrals over the internet.

---

## 2.3 Review of Existing Systems

To understand what is currently available, three existing systems were studied:

### 2.3.1 Teleprimary Care & Clinical Information System (TPC-OHCIS)
TPC-OHCIS is the clinical system developed by the Ministry of Health Malaysia for public health and dental clinics (Ministry of Health Malaysia, 2023).
* **What it does well:** It allows clinic staff to register patients, record consultation notes, prescribe medication, and order routine blood tests digitally.
* **Drawbacks:** It is built as a general clinic system, not a dedicated radiology system. It does not have detailed tracking for radiology referrals, does not provide tools to schedule scans at other nearby hospitals, and does not have a medical image viewer.

### 2.3.2 Orthanc Open-Source PACS Server
Orthanc is a well-known open-source software used by hospitals and researchers to store and view medical images (Jodogne, 2018).
* **What it does well:** It is lightweight, free, and can turn a standard computer into a medical image server. It includes a web browser viewer to see scans easily.
* **Drawbacks:** Orthanc is only an image storage tool (PACS). It does not have forms for doctors to refer patients, does not handle appointment scheduling, and has no reporting templates. It is an engineering tool, not a full clinic workflow system.

### 2.3.3 Commercial Hospital Radiology Systems (e.g., Karisma RIS)
Karisma is a commercial Radiology Information System used in large private hospitals and imaging centers (Kestral, 2024).
* **What it does well:** It handles almost every part of a hospital radiology department, including voice dictation for radiologists, appointment calendars, and billing.
* **Drawbacks:** It is very expensive to buy and maintain, requires dedicated hospital servers, and is kept inside the hospital's private network. It cannot easily be used by a small public clinic down the road to send a referral.

---

## 2.4 Comparison of Existing Systems

Table 2.1 compares these three systems with the proposed **HealthGrid IQ** system:

**Table 2.1:** Comparison of Existing Systems with HealthGrid IQ
| Feature | MOH TPC-OHCIS | Orthanc PACS | Commercial RIS (Karisma) | HealthGrid IQ (Proposed) |
| :--- | :--- | :--- | :--- | :--- |
| **System Type** | Clinic Outpatient System | Image Storage Server | Hospital Department Software | Clinic-to-Hospital Referral Web System |
| **Main Users** | Clinic Doctors, Nurses | Radiologists, Engineers | Hospital Radiology Staff | Clinic Doctors, Radiographers, Radiologists, Admins |
| **Digital Referral Form** | Basic text box in notes | None | Built for hospital internal use | Dedicated digital *Borang Radiologi* replacement |
| **Status Tracking** | Basic status | None | Detailed inside hospital | 4-step status (*Created*, *Scheduled*, *Scanned*, *Finalized*) |
| **Scheduling Across Centers** | None | None | Inside one hospital only | Suggests nearest available center using road distance |
| **Image Viewing** | None | Yes (Web DICOM) | Yes (Desktop Workstation) | Yes (Web browser viewer) |
| **Draft Report Helper** | None | None | Voice typing | Structured template auto-fill |
| **Cost & Deployment** | Government project | Free open-source | Expensive commercial license | Lightweight web prototype |

### 2.4.2 Discussion and Findings
Looking at the comparison above, there is a clear gap:
* Existing clinic systems (like TPC-OHCIS) focus on general patient visits, not radiology tracking.
* Image servers (like Orthanc) store pictures but do not manage referrals.
* Commercial systems (like Karisma) are too expensive and locked inside big hospitals.

HealthGrid IQ fills this gap by providing a simple, affordable web platform that lets small clinics send referrals, track scan progress, and receive reports from hospitals digitally.

---

## 2.5 Assistive Features and Scheduling Logic

### 2.5.1 Structured Draft Reports and Doctor Verification
Radiologists have to write many reports every day, which takes a lot of typing time. Research shows that using structured report templates helps make reports clearer and reduces mistakes (Weiss et al., 2021). 

In HealthGrid IQ, an assistive feature helps speed this up. When a radiologist opens a case, the system automatically pulls the patient's information, the reason for the scan, and the scan type into a clean report template. The radiologist can then focus on typing their findings and impression without re-typing patient details from scratch.

### 2.5.2 Distance Calculation Using Haversine and OSRM
When a clinic needs to find an alternative center for a patient's scan, distance matters. 
1. The **Haversine formula** is a mathematical formula that calculates the direct straight-line distance between two GPS coordinates on earth:
   $$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)} \right)$$
2. However, cars travel on roads, not straight lines. To give realistic travel times, HealthGrid IQ integrates with the **Google Maps Directions API**, backed by the Open Source Routing Machine (OSRM) as a secondary fallback (Huber & Rust, 2022). This allows the system to show actual estimated driving distance and travel time to help administrators pick the most convenient center for the patient.

### 2.5.3 Keeping the Human in Control (Ethics)
Whenever software is used in healthcare, safety and ethics are top priorities. World Health Organization guidelines (WHO, 2021) state that software must never replace human doctors or make automatic clinical decisions on its own.

HealthGrid IQ strictly follows this principle:
* The report drafting tool only creates an **editable draft**, not a final decision.
* A case can only be finalized when a certified human doctor reviews, edits, and signs it.
* The scheduling helper only **recommends** options; the human administrator makes the final booking.

---

## 2.6 Project Gap

To summarize, current public health clinics still face several key problems:
1. They still use paper forms (*Borang Permohonan Pemeriksaan Radiologi*) that can get lost or damaged.
2. Clinic doctors cannot see whether their referred patients have completed their scans.
3. Staff have to manually call around when local machines are unavailable.
4. Existing software is either too general (like clinic EMRs) or too expensive and complicated (like hospital RIS/PACS).

HealthGrid IQ is designed specifically to solve these problems by providing a simple, web-based bridge between clinics and imaging centers.

---

## 2.7 Chapter Summary

This chapter reviewed the basic concepts of medical imaging workflows (RIS, PACS, and DICOM) and compared three existing systems. The comparison showed that existing solutions are either too broad or too hospital-specific, leaving a clear need for a lightweight referral coordination platform. Finally, the chapter discussed how structured report drafting and distance-based routing (OSRM) can be practically used while keeping human healthcare professionals firmly in control.

---
\pagebreak

# REFERENCES

1. Che Mohamed, S., Yaakob, R., & Ramli, N. (2021). Diagnostic imaging referral patterns and turnaround times between primary healthcare clinics and tertiary centers in Malaysia. *Malaysian Journal of Medicine and Health Sciences*, 17(3), 112–119.
2. European Society of Radiology (ESR). (2021). The future role of radiology in healthcare: A position paper by the European Society of Radiology. *Insights into Imaging*, 12(1), 1–11. https://doi.org/10.1186/s13244-021-01043-4
3. Hasan, M. A., Yusof, S., & Ahmad, N. (2022). Digital health transformation in Malaysian public primary care: Challenges and operational bottlenecks. *Journal of Health Informatics in Developing Countries*, 16(1), 45–58.
4. Huber, S., & Rust, C. (2022). Calculate travel time and distance with OpenStreetMap data using the Open Source Routing Machine (OSRM). *The Stata Journal*, 16(2), 416–423.
5. Jodogne, S. (2018). The Orthanc ecosystem for medical imaging. *Journal of Digital Imaging*, 31(3), 341–352. https://doi.org/10.1007/s10278-018-0082-y
6. Kestral Computing. (2024). *Karisma Radiology Information System: Technical Overview*. Kestral Product Documentation.
7. Ministry of Health Malaysia (KKM). (2023). *Teleprimary Care and Oral Health Clinical Information System (TPC-OHCIS): User and Operational Overview*. Health Informatics Centre, Ministry of Health Malaysia.
8. Pianykh, O. S. (2020). *Digital Imaging and Communications in Medicine (DICOM): A Practical Introduction and Survival Guide* (3rd ed.). Springer. https://doi.org/10.1007/978-3-642-10850-1
9. Weiss, D. L., Langlotz, C. P., & Kahn, C. E. (2021). Structured reporting in radiology: An operational perspective. *Journal of the American College of Radiology*, 18(5), 724–731. https://doi.org/10.1016/j.jacr.2020.12.018
10. World Health Organization (WHO). (2021). *Ethics and governance of artificial intelligence for health: WHO guidance*. World Health Organization. https://www.who.int/publications/i/item/9789240029200
