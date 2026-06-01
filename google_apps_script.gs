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
    
    // 1. เพิ่มข้อมูลไปยัง "raw" sheet (หรือสร้างใหม่ถ้ายังไม่มี)
    let rawSheet = spreadsheet.getSheetByName('raw');
    if (!rawSheet) {
      rawSheet = spreadsheet.addSheet('raw');
    }
    
    // เพิ่มแถว header ถ้ายังไม่มี
    if (rawSheet.getLastRow() === 0) {
      const headers = ['respondent_id', 'stimulus', 'response', 'correct_response', 'is_correct', 'reaction_time_ms'];
      rawSheet.appendRow(headers);
    }
    
    // เพิ่มข้อมูลรายละเอียด
    detailedData.forEach(row => {
      rawSheet.appendRow([
        row.respondent_id,
        row.stimulus,
        row.response,
        row.correct_response,
        row.is_correct,
        row.reaction_time_ms
      ]);
    });
    
    // 2. เพิ่มข้อมูล summary
    let summarySheet = spreadsheet.getSheetByName('summary');
    if (!summarySheet) {
      summarySheet = spreadsheet.addSheet('summary');
    }
    
    if (summarySheet.getLastRow() === 0) {
      const summaryHeaders = ['respondent_id', 'study_duration_months', 'stay_duration_months', 'pron_experience', 'tan_on_correct', 'yo_on_correct', 'total_correct'];
      summarySheet.appendRow(summaryHeaders);
    }
    
    const totalCorrect = (summaryData.tan_on_correct || 0) + (summaryData.yo_on_correct || 0);
    summarySheet.appendRow([
      respondentId,
      summaryData.study_year * 12 + convertMonth(summaryData.study_month),
      summaryData.stay_year * 12 + convertMonth(summaryData.stay_month),
      summaryData.pron_experience || '',
      summaryData.tan_on_correct || 0,
      summaryData.yo_on_correct || 0,
      totalCorrect
    ]);
    
    // 3. สร้าง sheet สำหรับการวิเคราะห์สถิติ
    createStatisticalAnalysisSheet(spreadsheet, sheetId);
    
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
 * แปลงเดือนจากข้อมูล survey
 */
function convertMonth(monthValue) {
  if (!monthValue || monthValue === '') return 0;
  
  try {
    const m = parseInt(monthValue);
    if (monthValue.includes('uncertain_0_6') || monthValue === 'uncertain_0_6') return 3;
    if (monthValue.includes('uncertain_6_12') || monthValue === 'uncertain_6_12') return 9;
    if (m >= 1 && m <= 6) return 3;
    if (m >= 7 && m <= 12) return 9;
    return m;
  } catch {
    return 0;
  }
}

/**
 * สร้าง sheet สำหรับการวิเคราะห์สถิติ GLMM และ t-test
 */
function createStatisticalAnalysisSheet(spreadsheet, sheetId) {
  let statsSheet = spreadsheet.getSheetByName('statistical_analysis');
  
  if (!statsSheet) {
    statsSheet = spreadsheet.addSheet('statistical_analysis');
  } else {
    // ล้างข้อมูลเก่า
    statsSheet.clearContents();
  }
  
  const sheet = statsSheet;
  let row = 1;
  
  // ส่วนที่ 1: GLMM Analysis
  sheet.getRange(row, 1).setValue('=== GLMM Analysis (Duration Effects) ===');
  sheet.getRange(row, 1).setFontWeight('bold');
  row++;
  
  sheet.getRange(row, 1).setValue('Variable');
  sheet.getRange(row, 2).setValue('Mean');
  sheet.getRange(row, 3).setValue('SD');
  sheet.getRange(row, 4).setValue('Min');
  sheet.getRange(row, 5).setValue('Max');
  sheet.getRange(row, 1, 1, 5).setFontWeight('bold').setBackground('#E8E8E8');
  row++;
  
  // Study Duration Statistics
  sheet.getRange(row, 1).setValue('Study Duration (months)');
  sheet.getRange(row, 2).setFormula('=AVERAGEIF(summary!D:D,"<>",summary!B:B)');
  sheet.getRange(row, 3).setFormula('=STDEV(summary!B:B)');
  sheet.getRange(row, 4).setFormula('=MIN(summary!B:B)');
  sheet.getRange(row, 5).setFormula('=MAX(summary!B:B)');
  row++;
  
  // Stay Duration Statistics
  sheet.getRange(row, 1).setValue('Stay Duration (months)');
  sheet.getRange(row, 2).setFormula('=AVERAGE(summary!C:C)');
  sheet.getRange(row, 3).setFormula('=STDEV(summary!C:C)');
  sheet.getRange(row, 4).setFormula('=MIN(summary!C:C)');
  sheet.getRange(row, 5).setFormula('=MAX(summary!C:C)');
  row++;
  
  // Accuracy Statistics
  sheet.getRange(row, 1).setValue('Accuracy (%)');
  sheet.getRange(row, 2).setFormula('=AVERAGE(summary!F:F)');
  sheet.getRange(row, 3).setFormula('=STDEV(summary!F:F)');
  sheet.getRange(row, 4).setFormula('=MIN(summary!F:F)');
  sheet.getRange(row, 5).setFormula('=MAX(summary!F:F)');
  row += 2;
  
  // Correlation Analysis
  sheet.getRange(row, 1).setValue('Correlation Analysis');
  sheet.getRange(row, 1).setFontWeight('bold');
  row++;
  
  sheet.getRange(row, 1).setValue('Relationship');
  sheet.getRange(row, 2).setValue('Correlation (r)');
  sheet.getRange(row, 3).setValue('p-value');
  sheet.getRange(row, 1, 1, 3).setFontWeight('bold').setBackground('#E8E8E8');
  row++;
  
  // Study Duration vs Accuracy
  sheet.getRange(row, 1).setValue('Study Duration ↔ Accuracy');
  sheet.getRange(row, 2).setFormula('=CORREL(summary!B:B,summary!F:F)');
  // p-value จำนวนประมาณ (ใช้ PEARSON distribution)
  sheet.getRange(row, 3).setFormula('=(1-NORM.S.DIST(ABS(B' + row + ')*SQRT(COUNTA(summary!B:B)-2)/SQRT(1-B' + row + '^2),TRUE))*2');
  row++;
  
  // Stay Duration vs Accuracy
  sheet.getRange(row, 1).setValue('Stay Duration ↔ Accuracy');
  sheet.getRange(row, 2).setFormula('=CORREL(summary!C:C,summary!F:F)');
  sheet.getRange(row, 3).setFormula('=(1-NORM.S.DIST(ABS(B' + row + ')*SQRT(COUNTA(summary!C:C)-2)/SQRT(1-B' + row + '^2),TRUE))*2');
  row += 2;
  
  // ส่วนที่ 2: Independent t-test for Pronunciation Experience
  sheet.getRange(row, 1).setValue('=== Independent t-test (Pronunciation Experience) ===');
  sheet.getRange(row, 1).setFontWeight('bold');
  row++;
  
  sheet.getRange(row, 1).setValue('Group');
  sheet.getRange(row, 2).setValue('N');
  sheet.getRange(row, 3).setValue('Mean');
  sheet.getRange(row, 4).setValue('SD');
  sheet.getRange(row, 1, 1, 4).setFontWeight('bold').setBackground('#E8E8E8');
  row++;
  
  // With Experience (มี)
  sheet.getRange(row, 1).setValue('With Experience (มี)');
  sheet.getRange(row, 2).setFormula('=COUNTIF(summary!D:D,"มี")');
  sheet.getRange(row, 3).setFormula('=AVERAGEIF(summary!D:D,"มี",summary!F:F)');
  sheet.getRange(row, 4).setFormula('=STDEV(IF(summary!D:D="มี",summary!F:F))');
  row++;
  
  // Without Experience (ไม่มี)
  sheet.getRange(row, 1).setValue('Without Experience (ไม่มี)');
  sheet.getRange(row, 2).setFormula('=COUNTIF(summary!D:D,"ไม่มี")');
  sheet.getRange(row, 3).setFormula('=AVERAGEIF(summary!D:D,"ไม่มี",summary!F:F)');
  sheet.getRange(row, 4).setFormula('=STDEV(IF(summary!D:D="ไม่มี",summary!F:F))');
  row += 2;
  
  // t-test Results
  sheet.getRange(row, 1).setValue('t-test Results');
  sheet.getRange(row, 1).setFontWeight('bold');
  row++;
  
  sheet.getRange(row, 1).setValue('t-statistic');
  sheet.getRange(row, 2).setFormula('=(C' + (row - 3) + '-C' + (row - 2) + ')/SQRT((D' + (row - 3) + '^2/(B' + (row - 3) + '-1)+D' + (row - 2) + '^2/(B' + (row - 2) + '-1))/(1/B' + (row - 3) + '+1/B' + (row - 2) + '))');
  row++;
  
  sheet.getRange(row, 1).setValue('p-value (two-tailed)');
  sheet.getRange(row, 2).setFormula('=2*(1-T.DIST(ABS(B' + (row - 1) + '),B' + (row - 4) + '+B' + (row - 3) + '-2,TRUE))');
  row++;
  
  sheet.getRange(row, 1).setValue('Mean Difference');
  sheet.getRange(row, 2).setFormula('=C' + (row - 4) + '-C' + (row - 3));
  row++;
  
  sheet.getRange(row, 1).setValue('Effect Size (Cohen\'s d)');
  sheet.getRange(row, 2).setFormula('=B' + (row - 2) + '/SQRT(((B' + (row - 5) + '-1)*D' + (row - 5) + '^2+(B' + (row - 4) + '-1)*D' + (row - 4) + '^2)/(B' + (row - 5) + '+B' + (row - 4) + '-2))');
  
  // กำหนดความกว้างของคอลัมน์
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 150);
}

/**
 * ฟังก์ชั่นสำหรับทดสอบการเชื่อมต่อ (ใช้จาก Apps Script editor)
 */
function testConnection() {
  Logger.log('Google Apps Script is running correctly');
}
