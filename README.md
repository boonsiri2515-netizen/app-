# Health Web App for Google Apps Script

โปรเจกต์นี้เป็น Web App สำหรับบันทึกข้อมูลสุขภาพ โดยใช้ Google Apps Script เป็น backend และ Google Sheets เป็นฐานข้อมูล

## ไฟล์หลัก

- `Code.gs` backend, สร้าง Sheets, CRUD และ dashboard data
- `Index.html` หน้าเว็บแบบ Single Page App พร้อม Tailwind CSS
- `appsscript.json` manifest สำหรับ Apps Script

## วิธีใช้งาน

1. เปิด Google Apps Script
2. สร้างโปรเจกต์ใหม่
3. เพิ่มไฟล์ `Code.gs`, `Index.html`, และ `appsscript.json` ตามไฟล์ในโฟลเดอร์นี้
4. กด Run ฟังก์ชัน `setupDatabase` ครั้งแรก เพื่อสร้างฐานข้อมูล Google Sheets
5. Deploy เป็น Web app
6. เปิด URL ที่ได้จาก deployment

## Sheets ที่ระบบสร้าง

- `User_Logs`
- `Health_Metrics`
- `Doctor_Consultations`
- `Appointments`

ทุกชีตมีคอลัมน์แรกเป็น `ID` ซึ่งสร้างจาก timestamp แบบ unique และใช้สำหรับแก้ไข/ลบข้อมูล
