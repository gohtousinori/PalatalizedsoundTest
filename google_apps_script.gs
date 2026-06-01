// Google Apps Script สำหรับการวิเคราะห์สถิติ
// ติดตั้งไปที่ Extensions → Apps Script ใน Google Sheets

/**
 * ฟังก์ชันหลักที่ตรวจสอบคำขอมาจาก jsPsych
 * และสร้าง sheet เพิ่มเติมสำหรับการวิเคราะห์สถิติ
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheetId = payload.sheetId;
    const respondentId = payload.respondent_id;
    const summaryData = payload.summary;
    const detailedData = payload.detailed;
    
    // เปิด Google Sheet
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    
    // 1. เพิ่มข้อมูลไปยัง "raw" sheet เท่านั้น
    let rawSheet = spreadsheet.getSheetByName('raw');
    if (!rawSheet) {
      rawSheet = spreadsheet.addSheet('raw');
    }
    
    // เพิ่มแถว header ถ้ายังไม่มี
    if (rawSheet.getLastRow() === 0) {
      const headers = [
        'respondent_id', 
        'stimulus', 
        'response', 
        'correct_response', 
        'is_correct', 
        'reaction_time_ms',
        'study_duration_months',
        'stay_duration_months',
        'pron_experience'
      ];
      rawSheet.appendRow(headers);
    }
    
    // คำนวณระยะเวลา
    const studyDuration = convertYearMonth(summaryData.study_year, summaryData.study_month);
    const stayDuration = convertYearMonth(summaryData.stay_year, summaryData.stay_month);
    const pronExp = summaryData.pron_experience || '';
    
    // เพิ่มข้อมูลรายละเอียด
    detailedData.forEach(row => {
      rawSheet.appendRow([
        row.respondent_id,
        row.stimulus,
        row.response,
        row.correct_response,
        row.is_correct,
        row.reaction_time_ms,
        studyDuration,
        stayDuration,
        pronExp
      ]);
    });
    
    // 2. สร้าง sheet สำหรับการวิเคราะห์สถิติ
    createStatisticalAnalysisSheet(spreadsheet, rawSheet);
    
    // 3. ลบ sheet ที่ไม่ต้องใช้ (ถ้ามี)
    deleteUnusedSheets(spreadsheet);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data saved successfully',
      respondent_id: respondentId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * แปลง Year/Month เป็นจำนวนเดือนทั้งหมด
 */
function convertYearMonth(year, month) {
  try {
    const y = parseInt(year) || 0;
    let m = 0;
    
    if (typeof month === 'string') {
      if (month.includes('uncertain_0_6')) m = 3;
      else if (month.includes('uncertain_6_12')) m = 9;
      else m = parseInt(month) || 0;
    } else {
      m = parseInt(month) || 0;
    }
    
    if (m >= 1 && m <= 6) m = 3;
    else if (m >= 7 && m <= 12) m = 9;
    
    return y * 12 + m;
  } catch {
    return 0;
  }
}

/**
 * ลบ sheet ที่ไม่ต้องใช้
 */
function deleteUnusedSheets(spreadsheet) {
  const sheetsToDelete = ['summary', 'per_stimulus', 'Sheet1'];
  const sheets = spreadsheet.getSheets();
  
  sheets.forEach(sheet => {
    if (sheetsToDelete.includes(sheet.getName()) && spreadsheet.getSheets().length > 2) {
      spreadsheet.deleteSheet(sheet);
    }
  });
}

/**
 * สร้าง sheet สำหรับการวิเคราะห์สถิติ GLMM และ t-test
 */
function createStatisticalAnalysisSheet(spreadsheet, rawSheet) {
  let analysisSheet = spreadsheet.getSheetByName('analysis');
  
  if (!analysisSheet) {
    analysisSheet = spreadsheet.addSheet('analysis');
  } else {
    analysisSheet.clearContents();
  }
  
  const sheet = analysisSheet;
  let row = 1;
  
  // ส่วนที่ 1: GLMM Analysis (Regression Model)
  sheet.getRange(row, 1).setValue('GLMM Analysis (Study/Stay Duration Effects on Accuracy)');
  sheet.getRange(row, 1).setFontWeight('bold').setFontSize(12).setBackground('#4285F4').setFontColor('white');
  row++;
  
  // Descriptive Statistics
  row++;
  sheet.getRange(row, 1).setValue('Factor');
  sheet.getRange(row, 2).setValue('Mean');
  sheet.getRange(row, 3).setValue('SD');
  sheet.getRange(row, 4).setValue('Min');
  sheet.getRange(row, 5).setValue('Max');
  sheet.getRange(row, 6).setValue('N');
  sheet.getRange(row, 1, 1, 6).setFontWeight('bold').setBackground('#E8E8E8');
  row++;
  
  // Study Duration
  sheet.getRange(row, 1).setValue('Study Duration (months)');
  sheet.getRange(row, 2).setFormula('=IFERROR(AVERAGE(raw!G:G),0)');
  sheet.getRange(row, 3).setFormula('=IFERROR(STDEV(raw!G:G),0)');
  sheet.getRange(row, 4).setFormula('=IFERROR(MIN(raw!G:G),0)');
  sheet.getRange(row, 5).setFormula('=IFERROR(MAX(raw!G:G),0)');
  sheet.getRange(row, 6).setFormula('=COUNTA(raw!G:G)-1');
  row++;
  
  // Stay Duration
  sheet.getRange(row, 1).setValue('Stay Duration (months)');
  sheet.getRange(row, 2).setFormula('=IFERROR(AVERAGE(raw!H:H),0)');
  sheet.getRange(row, 3).setFormula('=IFERROR(STDEV(raw!H:H),0)');
  sheet.getRange(row, 4).setFormula('=IFERROR(MIN(raw!H:H),0)');
  sheet.getRange(row, 5).setFormula('=IFERROR(MAX(raw!H:H),0)');
  sheet.getRange(row, 6).setFormula('=COUNTA(raw!H:H)-1');
  row++;
  
  // Accuracy (%)
  sheet.getRange(row, 1).setValue('Accuracy (%)');
  sheet.getRange(row, 2).setFormula('=IFERROR(AVERAGE(IF(raw!E:E="TRUE",1,0))*100,0)');
  sheet.getRange(row, 3).setFormula('=IFERROR(STDEV(IF(raw!E:E="TRUE",1,0))*100,0)');
  sheet.getRange(row, 4).setFormula('=0');
  sheet.getRange(row, 5).setFormula('=100');
  sheet.getRange(row, 6).setFormula('=COUNTA(raw!E:E)-1');
  row += 2;
  
  // Correlation Analysis
  sheet.getRange(row, 1).setValue('Correlation Matrix (Pearson r)');
  sheet.getRange(row, 1).setFontWeight('bold').setBackground('#34A853').setFontColor('white');
  row++;
  
  sheet.getRange(row, 1).setValue('Comparison');
  sheet.getRange(row, 2).setValue('r');
  sheet.getRange(row, 3).setValue('p-value');
  sheet.getRange(row, 4).setValue('Significance');
  sheet.getRange(row, 1, 1, 4).setFontWeight('bold').setBackground('#E8E8E8');
  row++;
  
  // Study Duration vs Accuracy (GLMM)
  const studyAccRow = row;
  sheet.getRange(row, 1).setValue('Study Duration ↔ Accuracy');
  sheet.getRange(row, 2).setFormula('=IFERROR(CORREL(raw!G:G,IF(raw!E:E="TRUE",1,0)),0)');
  sheet.getRange(row, 3).setFormula('=IFERROR(IF(COUNTA(raw!G:G)>2,TTEST(raw!G:G,IF(raw!E:E="TRUE",1,0),2,2),0),0)');
  sheet.getRange(row, 4).setFormula('=IF(C' + row + '<0.001,"***",IF(C' + row + '<0.01,"**",IF(C' + row + '<0.05,"*","n.s.")))');
  row++;
  
  // Stay Duration vs Accuracy (GLMM)
  const stayAccRow = row;
  sheet.getRange(row, 1).setValue('Stay Duration ↔ Accuracy');
  sheet.getRange(row, 2).setFormula('=IFERROR(CORREL(raw!H:H,IF(raw!E:E="TRUE",1,0)),0)');
  sheet.getRange(row, 3).setFormula('=IFERROR(IF(COUNTA(raw!H:H)>2,TTEST(raw!H:H,IF(raw!E:E="TRUE",1,0),2,2),0),0)');
  sheet.getRange(row, 4).setFormula('=IF(C' + row + '<0.001,"***",IF(C' + row + '<0.01,"**",IF(C' + row + '<0.05,"*","n.s.")))');
  row += 2;
  
  // ส่วนที่ 2: Independent t-test for Pronunciation Experience
  sheet.getRange(row, 1).setValue('Independent t-test (Pronunciation Experience)');
  sheet.getRange(row, 1).setFontWeight('bold').setFontSize(12).setBackground('#EA4335').setFontColor('white');
  row++;
  
  row++;
  sheet.getRange(row, 1).setValue('Group');
  sheet.getRange(row, 2).setValue('N');
  sheet.getRange(row, 3).setValue('Mean (%)');
  sheet.getRange(row, 4).setValue('SD');
  sheet.getRange(row, 1, 1, 4).setFontWeight('bold').setBackground('#E8E8E8');
  row++;
  
  // With Experience
  const withExpRow = row;
  sheet.getRange(row, 1).setValue('With Experience (มี)');
  sheet.getRange(row, 2).setFormula('=COUNTIF(raw!I:I,"มี")');
  sheet.getRange(row, 3).setFormula('=IFERROR(AVERAGEIFS(IF(raw!E:E="TRUE",1,0),raw!I:I,"มี")*100,0)');
  sheet.getRange(row, 4).setFormula('=IFERROR(STDEV(IF((raw!I:I="มี")*(raw!E:E="TRUE"),1,0))*100,0)');
  row++;
  
  // Without Experience
  const withoutExpRow = row;
  sheet.getRange(row, 1).setValue('Without Experience (ไม่มี)');
  sheet.getRange(row, 2).setFormula('=COUNTIF(raw!I:I,"ไม่มี")');
  sheet.getRange(row, 3).setFormula('=IFERROR(AVERAGEIFS(IF(raw!E:E="TRUE",1,0),raw!I:I,"ไม่มี")*100,0)');
  sheet.getRange(row, 4).setFormula('=IFERROR(STDEV(IF((raw!I:I="ไม่มี")*(raw!E:E="TRUE"),1,0))*100,0)');
  row += 2;
  
  // t-test Results
  sheet.getRange(row, 1).setValue('t-test Results');
  sheet.getRange(row, 1).setFontWeight('bold').setBackground('#FBBC04').setFontColor('black');
  row++;
  
  sheet.getRange(row, 1).setValue('Statistic');
  sheet.getRange(row, 2).setValue('Value');
  sheet.getRange(row, 1, 1, 2).setFontWeight('bold').setBackground('#E8E8E8');
  row++;
  
  sheet.getRange(row, 1).setValue('t-value');
  sheet.getRange(row, 2).setFormula('=IFERROR((C' + withExpRow + '-C' + withoutExpRow + ')/SQRT(D' + withExpRow + '^2/B' + withExpRow + '+D' + withoutExpRow + '^2/B' + withoutExpRow + '),0)');
  row++;
  
  sheet.getRange(row, 1).setValue('df (degrees of freedom)');
  sheet.getRange(row, 2).setFormula('=B' + withExpRow + '+B' + withoutExpRow + '-2');
  row++;
  
  sheet.getRange(row, 1).setValue('p-value (two-tailed)');
  sheet.getRange(row, 2).setFormula('=IFERROR(TTEST(IF(raw!I:I="มี",IF(raw!E:E="TRUE",1,0)),IF(raw!I:I="ไม่มี",IF(raw!E:E="TRUE",1,0)),2,2),1)');
  row++;
  
  sheet.getRange(row, 1).setValue('Mean Difference (%)');
  sheet.getRange(row, 2).setFormula('=C' + withExpRow + '-C' + withoutExpRow);
  row++;
  
  sheet.getRange(row, 1).setValue('Effect Size (Cohen\'s d)');
  sheet.getRange(row, 2).setFormula('=IFERROR((C' + withExpRow + '-C' + withoutExpRow + ')/SQRT(((B' + withExpRow + '-1)*D' + withExpRow + '^2+(B' + withoutExpRow + '-1)*D' + withoutExpRow + '^2)/(B' + withExpRow + '+B' + withoutExpRow + '-2)),0)');
  row++;
  
  sheet.getRange(row, 1).setValue('Significance');
  const pvalueRow = row - 2;
  sheet.getRange(row, 2).setFormula('=IF(B' + pvalueRow + '<0.001,"***",IF(B' + pvalueRow + '<0.01,"**",IF(B' + pvalueRow + '<0.05,"*","n.s.")))');
  
  // กำหนดความกว้างของคอลัมน์
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 80);
}

/**
 * ฟังก์ชั่นสำหรับทดสอบการเชื่อมต่อ (ใช้จาก Apps Script editor)
 */
function testConnection() {
  Logger.log('Google Apps Script is running correctly');
}

