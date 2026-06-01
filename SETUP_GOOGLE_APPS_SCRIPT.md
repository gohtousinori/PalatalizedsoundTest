# การตั้งค่า Google Apps Script สำหรับการวิเคราะห์สถิติ

## วิธีติดตั้ง

### ขั้นตอนที่ 1: สร้าง Google Sheet ใหม่
1. ไปที่ [Google Sheets](https://sheets.google.com)
2. สร้าง spreadsheet ใหม่
3. คัดลอก **Sheet ID** จาก URL (ส่วน `/d/{sheetId}/edit`)

### ขั้นตอนที่ 2: ติดตั้ง Google Apps Script

1. เปิด Google Sheet ของคุณ
2. ไปที่ **Extensions** → **Apps Script**
3. ลบโค้ดเดิมออกทั้งหมด
4. คัดลอกเนื้อหาจากไฟล์ `google_apps_script.gs`
5. ตั้งชื่อโครงการ (ตัวอย่าง: "Sound Test Analysis")
6. กด **Save** (Ctrl+S / Cmd+S)

### ขั้นตอนที่ 3: ปรับแก้ URL ใน index.html

ใน `index.html` ที่บรรทัดประมาณ 130 ค้นหา:
```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzoWL_Z39qNRGM5JCH5Aw2-Zh6PQNSXDvlL_quRq9HvPJ438F_G9_GCQOCqxwgONY5tGw/exec';
```

จากนั้น:
1. ใน Apps Script editor ให้กด **Deploy** → **New Deployment**
2. เลือก type: **Web app**
3. ตั้งค่า:
   - Execute as: บัญชี Google ของคุณ
   - Who has access: Anyone
4. กด **Deploy**
5. คัดลอก URL ใหม่ที่ปรากฏขึ้น
6. ใน index.html แทนที่ URL เดิมด้วย URL ใหม่

### ขั้นตอนที่ 4: ปรับแก้ sheetId

ใน `index.html` ที่บรรทัดประมาณ 135 ค้นหา:
```javascript
sheetId: '1kmambkSB2os6UGpYd7PHZqyH8tmkJE4BvSWyjGzQQw0'
```

แทนที่ด้วย Sheet ID ของคุณ (จากขั้นตอนที่ 1)

## Sheet ที่สร้างขึ้นโดยอัตโนมัติ

### 1. **summary** sheet
- `respondent_id`: ID ผู้ทดสอบ
- `study_duration_months`: ระยะเวลาเรียนภาษาญี่ปุ่น (เดือน)
- `stay_duration_months`: ระยะเวลาอยู่ในญี่ปุ่น (เดือน)
- `pron_experience`: ประสบการณ์การเรียนการออกเสียง (มี/ไม่มี)
- `tan_on_correct`: จำนวนข้อถูก tan-on (เสียงเดี่ยว)
- `yo_on_correct`: จำนวนข้อถูก yo-on (เสียงควบ)
- `total_correct`: รวมข้อถูก

### 2. **raw** sheet
- ข้อมูลรายละเอียดของแต่ละข้อคำถาม
- `respondent_id`, `stimulus`, `response`, `correct_response`, `is_correct`, `reaction_time_ms`

### 3. **statistical_analysis** sheet (สร้างอัตโนมัติ)
มีการวิเคราะห์สถิติต่อไปนี้พร้อมสูตรการคำนวณฝังในเซลล์:

#### **GLMM Analysis**
- ค่าเฉลี่ย (Mean), ส่วนเบี่ยงเบนมาตรฐาน (SD), ค่าต่ำสุด (Min), ค่าสูงสุด (Max) สำหรับ:
  - Study Duration (months)
  - Stay Duration (months)
  - Accuracy (%)
- Correlation Analysis:
  - Study Duration ↔ Accuracy
  - Stay Duration ↔ Accuracy

#### **Independent t-test (Pronunciation Experience)**
- จำนวน (N), ค่าเฉลี่ย (Mean), SD สำหรับ:
  - Group with Experience (มี)
  - Group without Experience (ไม่มี)
- ผลการวิเคราะห์ t-test:
  - t-statistic
  - p-value (two-tailed)
  - Mean Difference
  - Effect Size (Cohen's d)

## การใช้งาน

1. เปิดไฟล์ `index.html` ในเบราว์เซอร์
2. ผู้ทดสอบทำแบบทดสอบให้เสร็จสิ้น
3. ข้อมูลจะถูกส่งไปยัง Google Sheets โดยอัตโนมัติ
4. แต่ละการตอบ sheet ใหม่จะถูกสร้างและอัปเดต:
   - **summary**: สรุปผลการทดสอบ
   - **raw**: รายละเอียดแต่ละข้อ
   - **statistical_analysis**: การวิเคราะห์สถิติปรับปรุง

## หมายเหตุ

- สูตรการคำนวณในแต่ละเซลล์จะอัปเดตโดยอัตโนมัติเมื่อมีข้อมูลใหม่เพิ่มเข้า
- การวิเคราะห์ใช้สูตร Google Sheets:
  - **CORREL**: คำนวณ correlation coefficient
  - **AVERAGEIF/STDEV**: สถิติพิ้นฐาน
  - **T.DIST**: คำนวณ t-test p-value
- เพื่อให้ได้ผลลัพธ์ที่แม่นยำ ต้องมีข้อมูลจากผู้ทดสอบอย่างน้อย 2 คน

## ปัญหาทั่วไป

**1. "ไม่สามารถส่งข้อมูลไปยัง Google Sheets"**
- ตรวจสอบว่า URL และ sheetId ถูกต้อง
- ตรวจสอบการอนุญาต (Authorization) ใน Apps Script

**2. "Sheet statistical_analysis ไม่แสดง"**
- รีเฟรช Google Sheet (Ctrl+R / Cmd+R)
- ตรวจสอบว่า Apps Script ได้ Deploy เรียบร้อย

**3. "สูตรแสดง #ERROR! หรือ #DIV/0!"**
- ตรวจสอบว่ามีข้อมูลใน sheet summary อย่างน้อย 1 แถว
- ล้างข้อมูลทั้งหมดแล้วเริ่มใหม่

## ข้อมูลเพิ่มเติม

- Python script `analyze_results.py` สำหรับการวิเคราะห์แบบเอกเทศ
- ใช้ scipy.stats สำหรับการคำนวณสถิติเพิ่มเติม
