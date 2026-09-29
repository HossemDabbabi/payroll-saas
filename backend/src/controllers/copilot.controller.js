const PayrollRecord = require('../models/PayrollRecord');

/**
 * Built-in fallback AI Engine for when external LLM API keys are not provided.
 * Executes exact RAG matching, statutory tax breakdown, and platform onboarding answers.
 */
const generateLocalCopilotResponse = (query, latestRecord) => {
  const q = query.toLowerCase().trim();
  const employees = latestRecord ? latestRecord.employees || [] : [];

  // 1. Employee Data Query Detection & Fuzzy Name / Matricule Matching
  const isEmployeeQuery =
    q.includes('employee') ||
    q.includes('information') ||
    q.includes('detail') ||
    q.includes('salary') ||
    q.includes('emp') ||
    q.includes('who is') ||
    q.includes('for ') ||
    employees.some((e) =>
      q.includes(e.nom_prenom.toLowerCase()) ||
      q.includes(e.matricule.toLowerCase()) ||
      e.nom_prenom.toLowerCase().split(' ').some((part) => part.length > 3 && q.includes(part))
    );

  if (isEmployeeQuery) {
    // Attempt exact or partial match
    let matchedEmp = employees.find(
      (e) =>
        q.includes(e.nom_prenom.toLowerCase()) ||
        q.includes(e.matricule.toLowerCase())
    );

    if (!matchedEmp) {
      // Partial name matching
      matchedEmp = employees.find((e) => {
        const parts = e.nom_prenom.toLowerCase().split(' ');
        return parts.some((p) => p.length > 2 && q.includes(p));
      });
    }

    if (matchedEmp) {
      const gross = matchedEmp.salaire_base + matchedEmp.prime + matchedEmp.overtime_bonus - matchedEmp.late_deduction - matchedEmp.absence_deduction;
      return `### Employee Summary: **${matchedEmp.nom_prenom}** (${matchedEmp.matricule})

Here is the complete compensation breakdown for **${matchedEmp.nom_prenom}** based on the current **${latestRecord ? `${latestRecord.period.month}/${latestRecord.period.year}` : 'latest'}** payroll statement:

| Component | Amount (TND) | Description |
| :--- | :--- | :--- |
| **Base Salary** | \`${matchedEmp.salaire_base.toFixed(3)}\` | Monthly contract base |
| **Prime / Bonus** | \`+${matchedEmp.prime.toFixed(3)}\` | Performance & allowances |
| **Overtime Bonus** | \`+${matchedEmp.overtime_bonus.toFixed(3)}\` | ${matchedEmp.heures_supp} hours at 1.25x rate |
| **Late Deduction** | \`-${matchedEmp.late_deduction.toFixed(3)}\` | ${matchedEmp.heures_retard} hours penalty |
| **Absence Deduction** | \`-${matchedEmp.absence_deduction.toFixed(3)}\` | ${matchedEmp.heures_absence} hours deduction |
| **CNSS Contribution** | \`-${matchedEmp.cnss.toFixed(3)}\` | 9.18% statutory social security |
| **IRPP Tax** | \`-${matchedEmp.irpp.toFixed(3)}\` | Income tax statutory progressive bracket |
| **Avance** | \`-${matchedEmp.avance.toFixed(3)}\` | Advance payment deduction |
| **Net Payable Salary** | **\`${matchedEmp.net_salary.toFixed(3)} TND\`** | **Final net payout** |

${matchedEmp.errors && matchedEmp.errors.length > 0 ? `\n> ⚠️ **Validation Notes:** ${matchedEmp.errors.join('; ')}` : ''}`;
    }

    // Check if user specifically named someone who was not found
    const targetNameMatch = query.match(/(?:for|about|employee|is|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (targetNameMatch || q.includes('who') || q.includes('give me')) {
      return `Employee not found in the current payroll records.`;
    }
  }

  // 2. Statutory & Tax Formula Explanations
  if (q.includes('irpp') || q.includes('tax') || q.includes('impot') || q.includes('bracket') || q.includes('bareme')) {
    return `### 🇹🇳 Tunisian IRPP (Income Tax) Calculation Guide

Under official Tunisian tax law, **IRPP (Impôt sur le Revenu des Personnes Physiques)** is computed using progressive annual brackets:

1. **Gross Taxable Salary:**
   $$\\text{Gross} = \\text{Base} + \\text{Prime} + \\text{Overtime} - \\text{Deductions}$$
2. **Net Taxable Salary:**
   $$\\text{Net Taxable} = \\text{Gross Salary} - \\text{CNSS (9.18\\%)}$$
3. **Annual Base & Professional Allowance:**
   - Annual Base = $\\text{Net Taxable} \\times 12$
   - **Professional Allowance:** 10% capped at **2,000 TND/year**.
   - Taxable Annual Income = $\\max(0, \\text{Annual Base} - \\text{Allowance})$
4. **Progressive Tax Schedule (Annual Tranches):**
   - **0 - 5,000 TND:** 0%
   - **5,000.001 - 20,000 TND:** 26%
   - **20,000.001 - 30,000 TND:** 28%
   - **30,000.001 - 50,000 TND:** 32%
   - **> 50,000 TND:** 35%
5. **Monthly IRPP:** $\\text{Annual IRPP} \\div 12$.`;
  }

  if (q.includes('cnss') || q.includes('social security') || q.includes('cotisation')) {
    return `### 🛡️ Tunisian CNSS Contribution Rules

- **Employee Rate:** **9.18%** of Gross Salary.
- **Formula:**
  $$\\text{CNSS} = \\text{Gross Taxable Salary} \\times 0.0918$$
- **Gross Salary** includes Base Salary, Primes, and Overtime bonuses minus late arrival and absence deductions.`;
  }

  if (q.includes('overtime') || q.includes('heures supp') || q.includes('extra')) {
    return `### ⏰ Overtime & Penalty Calculations

- **Overtime Bonus:** Calculated at **1.25x** the employee's hourly rate:
  $$\\text{Overtime Bonus} = \\text{Overtime Hours} \\times \\text{Hourly Rate} \\times 1.25$$
- **Late Penalty:**
  $$\\text{Late Deduction} = \\text{Late Hours} \\times \\text{Hourly Rate}$$
- **Absence Deduction:**
  $$\\text{Absence Deduction} = \\text{Absence Hours} \\times \\text{Hourly Rate}$$`;
  }

  // 3. Platform & Onboarding FAQs
  if (q.includes('upload') || q.includes('file') || q.includes('first') || q.includes('format') || q.includes('excel') || q.includes('csv')) {
    return `### 🚀 How to Upload & Process Payroll

1. **Navigate to Upload Page:** Click **Upload Payroll** in the left sidebar navigation.
2. **Select Period:** Pick the payroll Month and Year for the statement.
3. **Supported Formats:** Upload files in **.XLSX** (Excel) or **.CSV** formats.
4. **Required Columns:** Ensure your spreadsheet contains headers for:
   - \`Matricule\` (Employee ID)
   - \`Nom_Prenom\` (Full Name)
   - \`Salaire_Base\` (Base Salary)
   - \`Taux_Horaire\` (Hourly Rate)
5. **Optional Columns:** \`Heures_Retard\`, \`Heures_Absence\`, \`Heures_Supp\`, \`Prime\`, \`Avance\`, \`CNSS\`, \`IRPP\`.
   *(If CNSS or IRPP are omitted or 0, PayrollPro AI automatically calculates them using statutory Tunisian tax rules!)*`;
  }

  if (q.includes('plan') || q.includes('subscription') || q.includes('tier') || q.includes('limit')) {
    return `### 💳 Subscription Tiers & Employee Limits

PayrollPro offers three subscription tiers:
- **Starter Plan:** Up to **20 employees** per payroll cycle.
- **Business Plan:** Up to **30 employees** per payroll cycle.
- **Pro Plan:** Up to **50 employees** (or custom unlimited limits).

You can upgrade or manage your tier anytime from the **Subscription** page.`;
  }

  // Default Overview / General Help Response
  const recordCount = latestRecord ? latestRecord.employees.length : 0;
  return `Hello! I am **Payroll Copilot AI**, your automated HR & statutory compliance assistant.

Currently monitoring **${recordCount} employee records** for your active payroll period ${latestRecord ? `(${latestRecord.period.month}/${latestRecord.period.year})` : ''}.

Here are some things you can ask me:
- 👤 *"Give me all information for Ahmed Ben Salah"*
- 📐 *"How is IRPP calculated in Tunisia?"*
- 🛡️ *"What is the employee CNSS rate?"*
- 📁 *"How do I upload my first payroll file?"*
- ⏰ *"How is overtime computed?"*`;
};

// POST /api/copilot/chat
const handleCopilotChat = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Query string is required.' });
    }

    const companyId = req.user._id.toString();

    // Fetch the company's latest payroll record
    const latestRecord = await PayrollRecord.findOne({ company: req.user._id })
      .sort({ 'period.year': -1, 'period.month': -1 });

    const latestPayrollRecords = latestRecord ? latestRecord.employees : [];

    // Construct system context prompt template
    const systemPrompt = `
You are Payroll Copilot AI, an intelligent HR & Payroll assistant for the PayrollPro platform.

### COMPANY DATA CONTEXT:
The following are the active employee payroll records for Company ID: ${companyId}:
${JSON.stringify(latestPayrollRecords, null, 2)}

### PLATFORM ONBOARDING & GUIDELINES:
1. How to upload first file: Go to "Upload Payroll" in the sidebar, download the template Excel, fill employee details, and drag-and-drop the file.
2. Supported Formats: .XLSX, .CSV.
3. Subscription Tiers: Starter (<= 20 emp), Business (21-30 emp), Pro (31-50 emp).

### TUNISIAN TAX & PAYROLL LAWS:
1. CNSS: Employee rate is 9.18% of Gross Salary.
2. IRPP: Calculated after subtracting CNSS and 10% professional allowance (max 2000 TND/year). Applied on annual brackets (0% up to 5k TND, 26% up to 20k TND, 28% up to 30k TND, 32% up to 50k TND, 35% above 50k TND).
3. Overtime: Hourly Rate * 1.25.
4. Late Penalty: Late Hours * Hourly Rate.

### INSTRUCTIONS:
- If asked about an employee, match their name or matricule from the dataset and provide a clean summary table of their Base Salary, Overtime, Deductions, CNSS, IRPP, and Net Salary.
- If an employee is not found, state clearly: "Employee not found in the current payroll records."
- Keep answers concise, professional, and neatly formatted with Markdown bolding and bullet points.
`;

    let answer = '';

    // Check if an external LLM key is configured (OpenAI or Gemini)
    if (process.env.OPENAI_API_KEY) {
      try {
        const fetch = globalThis.fetch || require('node-fetch');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query },
            ],
            temperature: 0.2,
          }),
        });
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          answer = data.choices[0].message.content;
        }
      } catch (err) {
        console.error('OpenAI API call failed, falling back to local engine:', err.message);
      }
    } else if (process.env.GEMINI_API_KEY) {
      try {
        const fetch = globalThis.fetch || require('node-fetch');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUSER QUERY: ${query}` }],
              },
            ],
          }),
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          answer = data.candidates[0].content.parts.map((p) => p.text).join('\n');
        }
      } catch (err) {
        console.error('Gemini API call failed, falling back to local engine:', err.message);
      }
    }

    // Fallback to local intelligent copilot engine if LLM API is not set or failed
    if (!answer) {
      answer = generateLocalCopilotResponse(query, latestRecord);
    }

    return res.json({
      success: true,
      query,
      answer,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { handleCopilotChat };
