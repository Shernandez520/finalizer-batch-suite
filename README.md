# FINALIZER Batch Suite
Automated Adobe Illustrator Finalization System for Logo Registration Workflows

<p align="center">
  <img src="https://dummyimage.com/1200x250/1a1a1a/ffffff&text=FINALIZER+Batch+Suite" alt="FINALIZER Banner">
</p>

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey)
![Illustrator](https://img.shields.io/badge/Adobe%20Illustrator-2026-orange)

---

## ⚠️ Workflow-Specific Notice

This tool was built for a **specific internal production workflow** at a promotional products organization. It is not a general-purpose utility. Folder naming conventions (`PROOF#`, `FINAL`), file naming patterns (`GR#####_LR#####`), layer naming (`BACKGROUND`), and Illustrator version paths are all tailored to this environment.

If you work in a similar industry and want to adapt it, the architecture is straightforward — but expect to modify paths, naming conventions, and JSX logic for your own setup.

---

## 📋 Overview

**FINALIZER Batch Suite** automates the final production file processing step in a logo registration workflow. After a proof is approved by the customer, the Graphics team must prepare and upload finalized art files to the order management database. This step has traditionally been a manual, repetitive process prone to inconsistency.

FINALIZER eliminates that manual work entirely.

**The problem it solves:**
After proof approval, a technician previously had to:
- Manually duplicate the highest PROOF folder
- Open each PDF in Adobe Illustrator one by one
- Export a PNG from each file
- Toggle the BACKGROUND layer off in each document
- Save and close each file
- Manually create a ZIP of the PDFs
- Name everything consistently and log the run

FINALIZER does all of this from a single **Send-To** right-click action, with no further interaction required.

---

## ✨ Features

- Zero-click automation triggered via Windows Send-To
- Automatically identifies and clones the highest-numbered PROOF folder
- Batch PDF processing through Adobe Illustrator JSX scripting
- PNG export at consistent production settings
- BACKGROUND layer toggle (off) prior to PDF save
- Automatic cleanup of `.ai` temp files
- ZIP creation scoped to PDFs only, named per job convention
- Dropbox-safe retry logic for virtualized file environments
- Detailed log output per run

---

## 📁 Folder Structure

<p align="center">
  <img src="https://github.com/Shernandez520/finalizer-batch-suite/blob/main/FINALIZER/docs/Folder%20structure%20dia.png?raw=true" alt="Folder Structure Diagram" width="700">
</p>

---

## 🔄 Workflow Diagram

<p align="center">
  <img src="https://github.com/Shernandez520/finalizer-batch-suite/blob/main/FINALIZER/docs/Workflow%20automation.png?raw=true" alt="Workflow Diagram" width="800">
</p>

---

## 🚀 How It Works

1. Right-click any job folder
2. Select **Send to → FINALIZER**
3. The batch script:
   - Identifies the highest `PROOF#` folder
   - Clones it into a new `FINAL` folder
   - Opens all PDFs in Adobe Illustrator
   - Runs the JSX automation suite (export PNG, toggle BACKGROUND layer, save PDF, close)
   - Waits for Illustrator to finish via a flag file handshake
   - Removes `.ai` temp files
   - Creates a ZIP of PDFs only, named `JOBNAME_FINAL.zip`
   - Writes a detailed log file

4. The FINAL folder contains:
   - Updated PDFs (BACKGROUND layer off)
   - PNG exports
   - A ZIP ready for database upload
   - A log file documenting the run

---

## 🛠 Requirements

- Windows 10 or 11
- Adobe Illustrator 2026
- PowerShell
- Dropbox (if operating in a Dropbox-virtualized file environment)

---

## 📦 Installation

### 1. Clone or download this repository

```
git clone https://github.com/Shernandez520/finalizer-batch-suite.git
```

### 2. Place the `src` files in a Scripts folder

Example:
```
C:\Scripts\
```

### 3. Install the Send-To shortcut

Use the included PowerShell installer:

```
install_sendto.ps1
```

### 4. Ensure Illustrator paths match your system

Edit `FINALIZER.bat` if Illustrator is installed in a different directory.

---

## 🧩 Send-To Installer Script

Save this as `install_sendto.ps1`:

```powershell
# Path to FINALIZER.bat
$scriptPath = "C:\Scripts\FINALIZER.bat"

# Path to Send-To folder
$sendTo = [Environment]::GetFolderPath("SendTo")

# Shortcut path
$shortcut = Join-Path $sendTo "FINALIZER.lnk"

# Create WScript Shell COM object
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcut)

# Set shortcut target
$sc.TargetPath = $scriptPath
$sc.WorkingDirectory = Split-Path $scriptPath
$sc.IconLocation = "shell32.dll, 13"

# Save shortcut
$sc.Save()

Write-Host "FINALIZER Send-To shortcut installed successfully."
```

---

## 🗺️ Phase 2 Vision

The current tool handles local file finalization. A natural next phase would extend automation upstream into the order management system:

- **API integration** to automatically upload FINAL files to the database upon completion
- **GR auto-completion** triggered post-upload, eliminating the manual database entry step
- Proofing would remain a manual, human-reviewed step — automation only engages post-approval

This would reduce turnaround time further and remove the remaining manual touchpoint between file finalization and order completion.

---

## 💼 Portfolio Context

This project is included in my portfolio as a real-world example of **workflow automation design and implementation** in a production environment.

It demonstrates:
- **Problem identification from domain expertise** — recognizing a high-frequency manual process as an automation target
- **Cross-technology orchestration** — coordinating Windows Batch, Adobe ExtendScript (JSX), and PowerShell within a single workflow
- **Production environment constraints** — designing around Dropbox file virtualization, Illustrator's document lifecycle, and flag-based process synchronization
- **Deterministic, repeatable output** — every run produces consistent, predictable results regardless of job size
- **Practical scoping** — keeping human judgment (proof approval) in the loop while automating the mechanical steps that follow

This was built entirely on personal time as a solution to a real operational pain point, then proposed internally for adoption.

---

## 🧩 Technologies Used

- Windows Batch Scripting
- Adobe Illustrator ExtendScript (JSX)
- PowerShell ZIP utilities
- Dropbox-safe file handling

---

## 📝 License

This project is licensed under the **MIT License**.

---

## 📚 Changelog

### Version 1.0
- Initial release
- Stable Illustrator automation via JSX
- ZIP retry logic for Dropbox environments
- Flag-based process synchronization
- Clean per-run logging
