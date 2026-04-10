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

## Overview
**FINALIZER Batch Suite** is a fully automated Adobe Illustrator processing system designed for high-volume logo registration workflows.  
It opens PDFs, exports PNGs, toggles BACKGROUND layers, saves updated PDFs, removes temporary artifacts, and generates a clean ZIP package — all triggered from a simple **Send-To** action in Windows.

This system is engineered for **Dropbox-virtualized environments**, where file locking, sync delays, and temp artifacts can break traditional automation. FINALIZER handles all of it safely and silently.

---

## ✨ Features
- Zero-click automation
- Batch PDF processing via Illustrator JSX
- PNG export at consistent production settings
- BACKGROUND layer toggle
- Automatic cleanup of `.ai` files
- ZIP creation (PDFs only)
- Dropbox-safe retry logic
- Clean log output
- Deterministic, repeatable results

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
   - Clones the highest PROOF folder into FINAL
   - Opens all PDFs in Illustrator
   - Runs the JSX automation suite
   - Waits for Illustrator to finish via a flag file
   - Removes `.ai` files
   - Creates a ZIP of PDFs only
   - Writes a detailed log

4. The FINAL folder contains:
   - Updated PDFs
   - PNG exports
   - A ZIP ready for delivery
   - A log file documenting the run

---

## 🛠 Requirements
- Windows 10 or 11
- Adobe Illustrator 2026
- PowerShell
- Dropbox (optional)

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

## 🧩 Technologies Used
- Windows Batch Scripting
- Adobe Illustrator ExtendScript (JSX)
- PowerShell ZIP utilities
- Dropbox-safe file handling

---

## 📝 License
This project is licensed under the **MIT License**.

---

## 🔖 Recommended GitHub Tags

```
illustrator
automation
batch-script
jsx
workflow-automation
production-tools
design-automation
dropbox-workflow
pdf-processing
png-export
```

---

## 📚 Changelog

### Version 1.0
- Initial public release
- Stable Illustrator automation
- ZIP retry logic
- Clean logging
- Flag-based synchronization
- Dropbox-safe operations
