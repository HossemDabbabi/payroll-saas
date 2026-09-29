const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const PayrollRecord = require('../models/PayrollRecord');

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// GET /api/reports/:payrollId/excel
const downloadExcel = async (req, res, next) => {
  try {
    const record = await PayrollRecord.findOne({ _id: req.params.payrollId, company: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: 'Payroll record not found.' });

    const rows = record.employees.map((emp) => ({
      Matricule: emp.matricule,
      'Nom / Prenom': emp.nom_prenom,
      'Salaire Base': emp.salaire_base,
      'Taux Horaire': emp.taux_horaire,
      'Heures Retard': emp.heures_retard,
      'Heures Absence': emp.heures_absence,
      'Heures Supp': emp.heures_supp,
      Prime: emp.prime,
      'Deduction Retard': emp.late_deduction,
      'Deduction Absence': emp.absence_deduction,
      CNSS: emp.cnss || 0,
      IRPP: emp.irpp || 0,
      Avance: emp.avance || 0,
      'Bonus Heures Supp': emp.overtime_bonus,
      'Salaire Net': emp.net_salary,
      Erreurs: emp.errors.join('; ') || 'None',
    }));

    // Summary row
    rows.push({});
    rows.push({
      Matricule: 'TOTAL',
      'Salaire Net': record.summary.totalNetPayout,
      'Deduction Retard': record.summary.totalLateDeductions,
      'Deduction Absence': record.summary.totalAbsenceDeductions,
      CNSS: record.summary.totalCnss || 0,
      IRPP: record.summary.totalIrpp || 0,
      Avance: record.summary.totalAvance || 0,
      'Bonus Heures Supp': record.summary.totalOvertimeBonus,
      Prime: record.summary.totalPrimes,
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Array(16).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws, `Payroll_${record.period.month}_${record.period.year}`);
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    const month = MONTH_NAMES[record.period.month - 1];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Payroll_${month}_${record.period.year}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/:payrollId/payslip/:matricule
const downloadPayslipPDF = async (req, res, next) => {
  try {
    const record = await PayrollRecord.findOne({ _id: req.params.payrollId, company: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: 'Payroll record not found.' });

    const emp = record.employees.find((e) => e.matricule === req.params.matricule);
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found in this payroll record.' });

    const month = MONTH_NAMES[record.period.month - 1];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${emp.matricule}_${month}_${record.period.year}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('FICHE DE PAIE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Periode: ${month} ${record.period.year}`, { align: 'center' });
    doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).stroke();
    doc.moveDown();

    // Employee Info
    doc.fontSize(11).font('Helvetica-Bold').text('Informations Employe', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').text(`Matricule: ${emp.matricule}`);
    doc.text(`Nom / Prenom: ${emp.nom_prenom}`);
    doc.text(`Salaire de Base: ${emp.salaire_base.toFixed(2)} TND`);
    doc.text(`Taux Horaire: ${emp.taux_horaire.toFixed(2)} TND/h`);
    doc.moveDown();

    // Earnings
    doc.font('Helvetica-Bold').text('Gains', { underline: true });
    doc.moveDown(0.3);
    const drawRow = (label, value, color = '#000000') => {
      doc.font('Helvetica').fillColor(color).text(label, 50, doc.y, { continued: true })
        .text(`${value.toFixed(3)} TND`, { align: 'right' });
      doc.fillColor('#000000');
    };
    drawRow('Salaire de Base:', emp.salaire_base);
    drawRow(`Prime:`, emp.prime);
    drawRow(`Heures Supplementaires (${emp.heures_supp}h x ${emp.taux_horaire} x 1.25):`, emp.overtime_bonus, '#16a34a');
    doc.moveDown();

    // Deductions
    doc.font('Helvetica-Bold').text('Deductions', { underline: true });
    doc.moveDown(0.3);
    drawRow(`Retard (${emp.heures_retard}h x ${emp.taux_horaire}):`, emp.late_deduction, '#dc2626');
    drawRow(`Absence (${emp.heures_absence}h x ${emp.taux_horaire}):`, emp.absence_deduction, '#dc2626');
    if (emp.cnss > 0) drawRow(`Cotisation CNSS (9.18%):`, emp.cnss, '#dc2626');
    if (emp.irpp > 0) drawRow(`Retenue IRPP (Bareme):`, emp.irpp, '#dc2626');
    if (emp.avance > 0) drawRow(`Avance sur Salaire:`, emp.avance, '#dc2626');
    doc.moveDown();

    // Net Salary
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(13).font('Helvetica-Bold').text(`SALAIRE NET A PAYER: ${emp.net_salary.toFixed(3)} TND`, { align: 'right' });

    // Warnings
    if (emp.errors && emp.errors.length > 0) {
      doc.moveDown();
      doc.fontSize(9).fillColor('#f59e0b').font('Helvetica').text('Avertissements: ' + emp.errors.join('; '));
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = { downloadExcel, downloadPayslipPDF };
