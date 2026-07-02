# Health Web App

โปรเจกต์นี้เป็น Web App สำหรับบันทึกข้อมูลสุขภาพ เวอร์ชันหลักตอนนี้รันผ่าน GitHub Pages ได้โดยตรง

## ไฟล์หลัก

- `index.html` หน้าเว็บแบบ Single Page App พร้อม Tailwind CSS สำหรับ GitHub Pages
- `Code.gs` backend เวอร์ชันเดิมสำหรับ Google Apps Script
- `appsscript.json` manifest เวอร์ชันเดิมสำหรับ Google Apps Script

## วิธีรันด้วย GitHub Pages

1. Commit และ Push ไฟล์ขึ้น GitHub
2. เปิดหน้า repository บน GitHub
3. ไปที่ `Settings` > `Pages`
4. ที่ `Build and deployment` เลือก `Deploy from a branch`
5. เลือก branch `main` และ folder `/root`
6. กด `Save`
7. รอ GitHub สร้างเว็บ แล้วเปิด URL ที่ GitHub Pages แสดงให้

## ฐานข้อมูล

เวอร์ชัน GitHub Pages ใช้ `localStorage` ของเบราว์เซอร์เป็นฐานข้อมูล เพราะ GitHub Pages ไม่มี backend และเขียน Google Sheets โดยตรงไม่ได้

ตารางข้อมูลในแอป:

- `User_Logs`
- `Health_Metrics`
- `Doctor_Consultations`
- `Appointments`

ทุกตารางมี `ID` เป็น unique timestamp สำหรับแก้ไข/ลบข้อมูล

ควรกด `Export` เพื่อสำรองข้อมูลเป็นไฟล์ JSON เป็นระยะ และใช้ `Import` เพื่อนำข้อมูลกลับเข้าแอป
