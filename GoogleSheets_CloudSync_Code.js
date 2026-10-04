/**
 * =========================================================================
 * كود مزامنة مبيعات الجيزة والصعيد مع Google Sheets (Apps Script)
 * =========================================================================
 * 
 * طريقة الاستخدام في دقيقة واحدة:
 * 1. افتح صفحة جديدة في Google Sheets عبر الرابط: https://sheets.new
 * 2. من القائمة العلوية اضغط على: ملحقات (Extensions) > Apps Script
 * 3. احذف أي كود موجود في المحرر، والصق هذا الملف بالكامل.
 * 4. اضغط حفظ (Save / أيقونة القرص 💾).
 * 5. اضغط على زر: نشر (Deploy) > نشر جديد (New deployment).
 * 6. اضغط على أيقونة الترس بجانب نوع النشر واختر: تطبيق ويب (Web app).
 * 7. الإعدادات المهمة جداً:
 *    - تنفيذ كـ (Execute as): "حسابي / Me"
 *    - من لديه حق الوصول (Who has access): "أي شخص / Anyone"
 * 8. اضغط نشر (Deploy) وامنح الصلاحيات، ثم انسخ رابط تطبيق الويب (Web App URL).
 * 9. الصق الرابط في التطبيق داخل "مركز المزامنة السحابية" واضغط حفظ.
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("master_state");
  if (!sheet) {
    sheet = ss.insertSheet("master_state");
    sheet.getRange(1, 1).setValue("{}");
  }
  var json = sheet.getRange(1, 1).getValue();
  if (!json || json === "") json = "{}";
  
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data payload" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var body = e.postData.contents;
    var data = JSON.parse(body);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. حفظ الحالة الكاملة في شيت master_state
    var stateSheet = ss.getSheetByName("master_state");
    if (!stateSheet) {
      stateSheet = ss.insertSheet("master_state");
    }
    stateSheet.getRange(1, 1).setValue(body);

    // 2. تحديث جدول المبيعات المقروء (للمدير والمتابعة الفورية)
    if (data.sales && Array.isArray(data.sales)) {
      var salesSheet = ss.getSheetByName("المبيعات");
      if (!salesSheet) {
        salesSheet = ss.insertSheet("المبيعات");
        salesSheet.appendRow([
          "المعرف (ID)",
          "التاريخ",
          "المشرف المسؤول",
          "الفرع / المنطقة",
          "اسم العميل / الصيدلية",
          "الصنف المباع",
          "الكمية",
          "سعر الوحدة (ج.م)",
          "الإجمالي (ج.م)",
          "طريقة الدفع",
          "المسجل بواسطة",
          "وقت التحديث"
        ]);
        salesSheet.setFrozenRows(1);
        salesSheet.getRange("A1:L1").setFontWeight("bold").setBackground("#e0f2fe");
      }

      var lastRow = salesSheet.getLastRow();
      if (lastRow > 1) {
        salesSheet.getRange(2, 1, lastRow - 1, 12).clearContent();
      }

      var rows = data.sales.map(function(s) {
        return [
          s.id || '',
          s.date || '',
          s.supervisor || '',
          s.branch || '',
          s.client || '',
          s.item || '',
          Number(s.qty) || 1,
          Number(s.unitPrice) || 0,
          Number(s.total) || 0,
          s.payment || '',
          s.recordedBy || '',
          new Date().toLocaleString('ar-EG')
        ];
      });

      if (rows.length > 0) {
        salesSheet.getRange(2, 1, rows.length, 12).setValues(rows);
      }
    }

    // 3. تحديث جدول الزيارات الميدانية المقروء
    if (data.visits && Array.isArray(data.visits)) {
      var visitsSheet = ss.getSheetByName("الزيارات_الميدانية");
      if (!visitsSheet) {
        visitsSheet = ss.insertSheet("الزيارات_الميدانية");
        visitsSheet.appendRow([
          "المعرف (ID)",
          "التاريخ",
          "الوقت",
          "المشرف المسؤول",
          "الفرع / المنطقة",
          "اسم العميل / المكان",
          "نوع الزيارة",
          "النتيجة / الإنجاز",
          "ملاحظات المشرف",
          "المسجل بواسطة"
        ]);
        visitsSheet.setFrozenRows(1);
        visitsSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#fef3c7");
      }

      var lastVRow = visitsSheet.getLastRow();
      if (lastVRow > 1) {
        visitsSheet.getRange(2, 1, lastVRow - 1, 10).clearContent();
      }

      var vRows = data.visits.map(function(v) {
        return [
          v.id || '',
          v.date || '',
          v.time || '',
          v.supervisor || '',
          v.branch || '',
          v.client || '',
          v.type || '',
          v.result || '',
          v.notes || '',
          v.recordedBy || ''
        ];
      });

      if (vRows.length > 0) {
        visitsSheet.getRange(2, 1, vRows.length, 10).setValues(vRows);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      salesCount: data.sales ? data.sales.length : 0,
      visitsCount: data.visits ? data.visits.length : 0,
      updatedAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
