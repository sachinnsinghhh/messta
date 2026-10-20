import os
import subprocess
import sys

def generate_pdf():
    html_path = r"c:\Users\sachi\OneDrive\Desktop\MESSTA\manual_source.html"
    pdf_path = r"c:\Users\sachi\OneDrive\Desktop\MESSTA\MESSTA_User_Manual.pdf"
    logo_path = r"c:\Users\sachi\OneDrive\Desktop\MESSTA\frontend\src\assets\messta-logo.png"

    # Convert logo to base64 if available
    logo_b64 = ""
    if os.path.exists(logo_path):
        import base64
        with open(logo_path, "rb") as f:
            logo_b64 = f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MESSTA - Comprehensive Platform & Operations Manual</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');

  @page {{
    size: A4 portrait;
    margin: 16mm 14mm 16mm 14mm;
    @bottom-right {{
      content: counter(page);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8pt;
      color: #94a3b8;
    }}
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    font-size: 10pt;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  .page {{
    page-break-after: always;
    position: relative;
    padding-bottom: 20px;
  }}

  .page:last-child {{
    page-break-after: avoid;
  }}

  /* ── COVER PAGE ── */
  .cover-page {{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 250mm;
    padding: 30mm 15mm 20mm 15mm;
    background: linear-gradient(145deg, #fff7ed 0%, #ffffff 45%, #fff1f2 100%);
    border: 1px solid #fed7aa;
    border-radius: 16px;
  }}

  .cover-header {{
    display: flex;
    align-items: center;
    gap: 16px;
  }}

  .cover-logo {{
    max-height: 64px;
    width: auto;
  }}

  .cover-brand-title {{
    font-size: 28pt;
    font-weight: 800;
    color: #ea580c;
    letter-spacing: -0.03em;
  }}

  .cover-body {{
    margin: 40mm 0;
  }}

  .cover-tag {{
    display: inline-block;
    background: #ffedd5;
    color: #c2410c;
    border: 1px solid #fdba74;
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 9pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 18px;
  }}

  .cover-main-title {{
    font-size: 32pt;
    font-weight: 800;
    line-height: 1.15;
    color: #0f172a;
    letter-spacing: -0.03em;
    margin-bottom: 14px;
  }}

  .cover-subtitle {{
    font-size: 13pt;
    color: #475569;
    line-height: 1.5;
    max-width: 90%;
  }}

  .cover-footer {{
    border-top: 2px solid #fdba74;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 8.5pt;
    color: #64748b;
  }}

  .cover-pill {{
    background: #0f172a;
    color: white;
    padding: 6px 14px;
    border-radius: 8px;
    font-weight: 700;
  }}

  /* ── HEADINGS & TYPOGRAPHY ── */
  h1.section-title {{
    font-size: 19pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 2px solid #ea580c;
    display: flex;
    align-items: center;
    gap: 8px;
  }}

  h2.sub-title {{
    font-size: 12pt;
    font-weight: 700;
    color: #ea580c;
    margin-top: 16px;
    margin-bottom: 6px;
  }}

  h3.item-title {{
    font-size: 10.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 10px;
    margin-bottom: 4px;
  }}

  p {{
    margin-bottom: 10px;
    color: #334155;
  }}

  /* ── CARDS & CONTAINERS ── */
  .card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 12px;
  }}

  .card-highlight {{
    background: #fff7ed;
    border: 1px solid #fed7aa;
  }}

  .card-emerald {{
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }}

  .grid-2 {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }}

  .grid-3 {{
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }}

  .grid-4 {{
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }}

  /* ── BADGES & PILLS ── */
  .badge {{
    display: inline-block;
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
  }}

  .badge-orange {{ background: #ffedd5; color: #c2410c; border: 1px solid #fdba74; }}
  .badge-emerald {{ background: #dcfce7; color: #15803d; border: 1px solid #86efac; }}
  .badge-blue {{ background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }}
  .badge-purple {{ background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }}

  /* ── TABLES ── */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 8.5pt;
  }}

  th {{
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 7.5pt;
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    text-align: left;
  }}

  td {{
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    color: #334155;
  }}

  tr:nth-child(even) td {{
    background: #f8fafc;
  }}

  /* ── LISTS ── */
  ul, ol {{
    margin-left: 20px;
    margin-bottom: 10px;
  }}

  li {{
    margin-bottom: 4px;
    color: #334155;
  }}

  /* ── CODE / FORMULAS ── */
  .formula {{
    font-family: 'JetBrains Mono', monospace;
    background: #0f172a;
    color: #38bdf8;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 8.5pt;
    margin: 8px 0 12px 0;
    line-height: 1.5;
  }}

  .flow-box {{
    border-left: 3px solid #ea580c;
    padding-left: 10px;
    margin-bottom: 10px;
  }}

  .step-number {{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ea580c;
    color: white;
    font-size: 8pt;
    font-weight: 800;
    margin-right: 6px;
  }}
</style>
</head>
<body>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 1: COVER PAGE -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page cover-page">
    <div class="cover-header">
      {f'<img src="{logo_b64}" class="cover-logo" alt="Messta Logo">' if logo_b64 else '<span class="cover-brand-title">MESSTA</span>'}
      <div>
        <div style="font-size: 8pt; font-weight: 800; color: #ea580c; text-transform: uppercase;">Smart Dining Operating System</div>
        <div style="font-size: 11pt; font-weight: 700; color: #334155;">Enterprise Platform Documentation</div>
      </div>
    </div>

    <div class="cover-body">
      <span class="cover-tag">Official Platform & Operations Manual</span>
      <h1 class="cover-main-title">MESSTA User Manual & Operating Blueprint</h1>
      <p class="cover-subtitle">
        A complete guide for Students, Mess Owners, Counter Cashiers, Kitchen Managers, and Accountants covering Digital Dining, Dual QR Passes, Smart Kitchen Inventory, Shift Rostering, and P&L Intelligence.
      </p>

      <div style="margin-top: 24px; display: flex; gap: 10px;">
        <span class="badge badge-orange">Student Portal</span>
        <span class="badge badge-emerald">Counter QR Scanner</span>
        <span class="badge badge-blue">Kitchen Inventory OS</span>
        <span class="badge badge-purple">Staff & Custom Roles</span>
        <span class="badge badge-orange">Finance & Unit Economics</span>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong>MESSTA Engineering & Product Team</strong><br>
        Release: Version 2.4 Enterprise Production Ready<br>
        Documentation Date: October 2026
      </div>
      <div class="cover-pill">
        Confidential & Operational Manual
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 2: TABLE OF CONTENTS & SYSTEM ARCHITECTURE -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>📖</span> Table of Contents & System Architecture</h1>
    
    <div class="grid-2">
      <div class="card card-highlight">
        <h3 class="item-title" style="color: #ea580c;">Table of Contents</h3>
        <ol style="margin-left: 16px; font-size: 8.5pt;">
          <li><strong>System Overview & Problem Statement</strong></li>
          <li><strong>Student Dining Portal</strong> (Discovery, Passes & Single Plates)</li>
          <li><strong>Dual Dynamic QR Architecture</strong> (Membership vs Plate Pass)</li>
          <li><strong>Owner Dashboard & Live Counter Scanner</strong></li>
          <li><strong>Thali Matrix, Operational Spreads & Pricing Algorithm</strong></li>
          <li><strong>Plans & Subscriber CRM</strong> (Token Lifecycle & Top-ups)</li>
          <li><strong>Kitchen Inventory Management</strong> (COGS, Par-Levels & Recipes)</li>
          <li><strong>Staff Management, Rostering & Custom Roles</strong></li>
          <li><strong>Finance & P&L Intelligence Engine</strong> (Double-Entry Ledger)</li>
          <li><strong>Troubleshooting, Security & FAQ</strong></li>
        </ol>
      </div>

      <div class="card">
        <h3 class="item-title">Executive Summary</h3>
        <p style="font-size: 8.5pt;">
          <strong>MESSTA</strong> transforms student dining and mess management across Indian campuses. It replaces paper registers, manual cash collection, and untracked kitchen leakage with an automated, cloud-based platform connecting diners directly with kitchen operations.
        </p>
        <p style="font-size: 8.5pt;">
          Every student pass verification triggers automated ingredient deductions in the pantry and updates real-time financial ledgers with zero manual bookkeeping.
        </p>
      </div>
    </div>

    <h2 class="sub-title">Messta End-to-End System Architecture</h2>
    <table>
      <thead>
        <tr>
          <th>User Role</th>
          <th>Primary Access Route</th>
          <th>Core Touchpoints</th>
          <th>Security & Access Level</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Student / Diner</strong></td>
          <td><code>/mess</code>, <code>/membership</code></td>
          <td>Mess discovery, pass purchase, dynamic QR display, slot booking</td>
          <td>User Auth (Student Framework Protected)</td>
        </tr>
        <tr>
          <td><strong>Counter Operator</strong></td>
          <td><code>/owner</code> (Counter Scanner)</td>
          <td>Camera QR scanning, 4-digit PIN verification, token redemption</td>
          <td>PIN-based staff audit logging</td>
        </tr>
        <tr>
          <td><strong>Kitchen Manager</strong></td>
          <td><code>/owner/inventory</code>, <code>/owner/meals</code></td>
          <td>Ingredient stock-in, recipe thresholds, daily thali publishing</td>
          <td>Inventory & Meal Management permission</td>
        </tr>
        <tr>
          <td><strong>Mess Owner / Admin</strong></td>
          <td><code>/owner/*</code></td>
          <td>Staff hiring, custom roles, P&L reports, gateway payouts, outlet config</td>
          <td>Full Owner Admin Privileges</td>
        </tr>
      </tbody>
    </table>

    <div class="card card-emerald">
      <h3 class="item-title" style="color: #15803d;">Key Technical Innovation: Real-Time Event Loop</h3>
      <p style="font-size: 8.5pt; margin-bottom: 0;">
        When a student scans their pass at the counter:
        <br><strong>(1)</strong> Instant Token Balance Check &rarr; 
        <strong>(2)</strong> Order transition to <code>redeemed</code> &rarr; 
        <strong>(3)</strong> Staff ID & Shift tagged to transaction &rarr; 
        <strong>(4)</strong> Raw ingredient COGS deducted in Inventory &rarr; 
        <strong>(5)</strong> Live entry posted in Double-Entry Finance Ledger.
      </p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 3: STUDENT DINING PORTAL & DUAL QR -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>🎟️</span> Student Portal & Dual QR Architecture</h1>

    <h2 class="sub-title">1. Student Discovery & Meal Booking Workflow</h2>
    <div class="grid-3">
      <div class="card">
        <div class="step-number">1</div><strong>Find Mess Outlet</strong>
        <p style="font-size: 8pt; margin-top: 4px;">
          Students navigate to <code>/mess</code>, browse nearby partner outlets with live distance, meal spread photos, cleanliness ratings, and pricing.
        </p>
      </div>
      <div class="step-number-box card">
        <div class="step-number">2</div><strong>Choose Membership or Plate</strong>
        <p style="font-size: 8pt; margin-top: 4px;">
          Purchase a monthly token pass (e.g., 60 Veg tokens @ ₹2,800) or buy a one-off single plate (e.g., Sunday Special Paneer Thali @ ₹110).
        </p>
      </div>
      <div class="step-number-box card">
        <div class="step-number">3</div><strong>Generate Secure Pass</strong>
        <p style="font-size: 8pt; margin-top: 4px;">
          Access the pass from <code>/membership</code>. A cryptographically signed dynamic QR code displays with time-expiring rolling tokens.
        </p>
      </div>
    </div>

    <h2 class="sub-title">2. Dual QR System Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Attribute</th>
          <th>A: Membership Token Pass</th>
          <th>B: Per-Plate Single Ticket</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Intended Use</strong></td>
          <td>Daily enrolled students with monthly/semester packages</td>
          <td>Casual diners, guest plates, out-of-plan special thalis</td>
        </tr>
        <tr>
          <td><strong>Pass Lifecycle</strong></td>
          <td>Multi-use declining balance (e.g., 58 / 60 Tokens remaining)</td>
          <td>Single-use ticket (valid only for specific date & meal slot)</td>
        </tr>
        <tr>
          <td><strong>QR Data Payload</strong></td>
          <td><code>userId</code>, <code>subscriptionId</code>, <code>messId</code>, <code>tokenType: "membership"</code>, <code>nonce</code></td>
          <td><code>orderId</code>, <code>bookingDate</code>, <code>mealType</code>, <code>thaliName</code>, <code>tokenType: "per_plate"</code></td>
        </tr>
        <tr>
          <td><strong>Redemption Action</strong></td>
          <td>Decrements 1 token from subscription balance; logs redemption date</td>
          <td>Marks order status from <code>active</code> to <code>redeemed</code> immediately</td>
        </tr>
        <tr>
          <td><strong>Student Interface</strong></td>
          <td><code>StudentMembership.jsx</code> with slot generator button</td>
          <td><code>MessDetail.jsx</code> / Profile with instant QR receipt</td>
        </tr>
      </tbody>
    </table>

    <div class="card card-highlight">
      <h3 class="item-title" style="color: #ea580c;">Slot-Based Anti-Crowding Engine</h3>
      <p style="font-size: 8.5pt;">
        To eliminate chaotic dining hall queues, the system allocates fixed capacity intervals (e.g., <em>12:30 PM &ndash; 01:00 PM: 35 Seats</em>). Students choose their preferred time slot when generating their pass. The counter operator's screen displays incoming reservations per slot to guide food warm-up quantities.
      </p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 4: OWNER DASHBOARD & COUNTER SCANNER -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>📱</span> Owner Dashboard & Live Counter Scanner</h1>

    <h2 class="sub-title">1. Counter Token Scanner Operations (`/owner`)</h2>
    <p>
      The counter scanner is the central operational workstation of the mess hall. It operates seamlessly on mobile phones, tablets, or desktop webcams.
    </p>

    <div class="grid-2">
      <div class="card">
        <h3 class="item-title">Scanner Security & PIN Verification</h3>
        <ul>
          <li><strong>Staff Sign-in PIN:</strong> Each counter operator enters their unique 4-digit PIN before scanning commences.</li>
          <li><strong>Shift Accountability:</strong> All redemptions are tagged with <code>scannedByStaffId</code> and active shift (Morning Lunch / Evening Dinner).</li>
          <li><strong>Fraud Prevention:</strong> The scanner rejects already redeemed tokens, expired slots, or mismatched mess branches with distinct audio chimes.</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="item-title">Counter Scanner Visual Signals</h3>
        <ul>
          <li><span class="badge badge-emerald">GREEN FLASH:</span> Valid pass. Student name, plan category (Veg/Non-Veg), and remaining tokens display instantly.</li>
          <li><span class="badge badge-orange">YELLOW ALERT:</span> Mismatch (e.g., Veg pass holder attempting to redeem a Non-Veg special thali).</li>
          <li><span class="badge" style="background:#fee2e2; color:#b91c1c;">RED BUZZER:</span> Duplicate scan attempt or exhausted token pass.</li>
        </ul>
      </div>
    </div>

    <h2 class="sub-title">2. Multi-Branch Outlet Management</h2>
    <p>
      Messta allows franchise and multi-branch mess owners to manage their entire network from a single unified portal.
    </p>
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>How It Operates</th>
          <th>Owner Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Branch Switching</strong></td>
          <td>Top dropdown switcher allows instant switching between outlets (e.g., North Campus vs South Campus).</td>
          <td>Select outlet from top header; all rosters, menus, inventory, and finance switch context.</td>
        </tr>
        <tr>
          <td><strong>Add New Outlet</strong></td>
          <td>Modal input captures Outlet Name, Locality, Full Address, Contact Phone, and Pure Veg / Non-Veg badge.</td>
          <td>Click <em>"+ Add New Mess / Branch"</em> in dashboard top bar.</td>
        </tr>
        <tr>
          <td><strong>Delete Branch</strong></td>
          <td>Allows removing decommissioned outlets with confirmation safeguards.</td>
          <td>Click the red <em>"Delete Branch"</em> button with password confirmation.</td>
        </tr>
      </tbody>
    </table>

    <div class="card card-emerald">
      <h3 class="item-title" style="color: #15803d;">Live Meal Queue Feed</h3>
      <p style="font-size: 8.5pt; margin-bottom: 0;">
        The dashboard features a live redemption feed displaying the last 20 students served, their exact timestamp, redeemed thali, and operator name, ensuring zero discrepancy between counter dishing and cashier records.
      </p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 5: THALI MATRIX & PRICING ALGORITHM -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>🍱</span> Thali Matrix & Operational Spreads</h1>

    <h2 class="sub-title">1. Operational Meal Spreads Configuration (`/owner/meals`)</h2>
    <p>
      Unlike rigid restaurant menus, mess operations run in distinct daily production batches. Messta structures menus around <strong>Operational Spreads</strong>:
    </p>

    <div class="grid-3">
      <div class="card">
        <h3 class="item-title">☀️ Breakfast Spread</h3>
        <p style="font-size: 8pt;">
          <strong>Window:</strong> 07:30 AM &ndash; 10:30 AM<br>
          <strong>Offerings:</strong> Poha, Upma, Idli Sambar, Paratha, Tea/Coffee.<br>
          <strong>Capacity:</strong> Typically rapid rotation (15-min intervals).
        </p>
      </div>

      <div class="card card-highlight">
        <h3 class="item-title">🍛 Lunch Spread</h3>
        <p style="font-size: 8pt;">
          <strong>Window:</strong> 12:00 PM &ndash; 03:00 PM<br>
          <strong>Offerings:</strong> Executive Paneer Thali, Standard Veg, Dal Tadka, Rice, Chapati.<br>
          <strong>Capacity:</strong> Peak rush (30-min seat blocks).
        </p>
      </div>

      <div class="card">
        <h3 class="item-title">🌙 Dinner Spread</h3>
        <p style="font-size: 8pt;">
          <strong>Window:</strong> 07:30 PM &ndash; 10:30 PM<br>
          <strong>Offerings:</strong> Special Non-Veg Chicken Thali, Deluxe Veg, Kheer.<br>
          <strong>Capacity:</strong> Evening student surge.
        </p>
      </div>
    </div>

    <h2 class="sub-title">2. Dynamic Spread Creation (+ Add Spread Feature)</h2>
    <p>
      Owners can add custom operational spreads (e.g., <em>Evening Snacks</em>, <em>Sunday Feast</em>, or <em>Late Night Study Spread</em>) with full autonomy over timings and thali publishing.
    </p>

    <h2 class="sub-title">3. The Crucial Link: Membership Tier Mapping</h2>
    <div class="card card-highlight">
      <p style="font-size: 8.5pt;">
        When creating or publishing a daily thali, the owner maps it to eligible membership tiers:
      </p>
      <ul style="font-size: 8.5pt;">
        <li><strong>Standard Veg Thali:</strong> Valid for <em>Lite Veg Pass</em> & <em>Executive Veg Pass</em> (Redeems 1 Token).</li>
        <li><strong>Special Non-Veg Thali:</strong> Valid strictly for <em>Non-Veg / Combo Pass</em> tokens.</li>
        <li><strong>Out-of-Plan Scenario:</strong> If a Veg Pass student orders a Non-Veg plate, the system detects the mismatch and routes them to direct UPI/card checkout (₹140) instead of deducting a token.</li>
      </ul>
    </div>

    <h2 class="sub-title">4. Real-Time Capacity Limiting</h2>
    <p style="font-size: 8.5pt;">
      Each time slot has an explicit seat cap (e.g., Max 40 seats). Once 40 students reserve that window, the slot automatically closes on the student app, directing subsequent diners to the next available 30-minute block and eliminating dining hall congestion.
    </p>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 6: PLANS & SUBSCRIBER CRM -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>👥</span> Plans & Subscriber CRM</h1>

    <h2 class="sub-title">1. Publishing Membership Plans (`/owner/memberships`)</h2>
    <p>
      Mess owners create subscription packages tailored to student budgets and semester schedules:
    </p>

    <table>
      <thead>
        <tr>
          <th>Plan Name</th>
          <th>Category</th>
          <th>Tokens Allocated</th>
          <th>Meals / Day</th>
          <th>Standard Price</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Monthly Unlimited Veg Pass</strong></td>
          <td><span class="badge badge-emerald">Veg</span></td>
          <td>60 Tokens (30 Days &times; 2 Meals)</td>
          <td>2 Meals (Lunch + Dinner)</td>
          <td>₹2,800 &ndash; ₹3,200</td>
        </tr>
        <tr>
          <td><strong>Executive Non-Veg Pass</strong></td>
          <td><span class="badge badge-orange">Combo</span></td>
          <td>60 Tokens (incl. 8 Special Thalis)</td>
          <td>2 Meals + Sunday Specials</td>
          <td>₹3,600 &ndash; ₹4,200</td>
        </tr>
        <tr>
          <td><strong>Student Lite Pass</strong></td>
          <td><span class="badge badge-blue">Veg</span></td>
          <td>30 Tokens (Lunch only)</td>
          <td>1 Meal / Day</td>
          <td>₹1,600 &ndash; ₹1,800</td>
        </tr>
        <tr>
          <td><strong>Flexi-Token 20 Pack</strong></td>
          <td><span class="badge badge-purple">Flexi</span></td>
          <td>20 Tokens (Valid 60 Days)</td>
          <td>On-Demand (Any meal)</td>
          <td>₹1,200</td>
        </tr>
      </tbody>
    </table>

    <h2 class="sub-title">2. Subscriber CRM Operations</h2>
    <div class="grid-2">
      <div class="card">
        <h3 class="item-title">Token Balance Management</h3>
        <p style="font-size: 8pt;">
          Owners can search any enrolled student by name, email, or phone. The subscriber ledger shows remaining tokens, total redemptions, plan validity, and recent meal timestamps.
        </p>
        <p style="font-size: 8pt;">
          <strong>Manual Adjustment:</strong> If a student was absent during college holidays, owners can credit compensation tokens with 1 click.
        </p>
      </div>

      <div class="card">
        <h3 class="item-title">Pass Lifecycle Controls</h3>
        <ul style="font-size: 8pt;">
          <li><strong>Pause Subscription:</strong> Temporarily freeze tokens when a student travels home during exam breaks.</li>
          <li><strong>Resume Subscription:</strong> Reactivate pass immediately upon the student's return.</li>
          <li><strong>Cancel & Refund:</strong> Prorated token refund calculations for students vacating hostels.</li>
        </ul>
      </div>
    </div>

    <div class="card card-emerald">
      <h3 class="item-title" style="color: #15803d;">Automated Expiry & Renewal Reminders</h3>
      <p style="font-size: 8.5pt; margin-bottom: 0;">
        When a student reaches their last 4 remaining tokens, the system pushes an automated renewal alert prompting them to top up before the 1st of the month, ensuring unbroken cashflow for the mess owner.
      </p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 7: KITCHEN INVENTORY MANAGEMENT -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>🥦</span> Kitchen Inventory & Raw Material OS</h1>

    <h2 class="sub-title">1. Ingredient Master & Categorization (`/owner/inventory`)</h2>
    <p>
      Food service inventory is perishable and fast-moving. Messta organizes kitchen pantry stock into three distinct operational groups:
    </p>

    <div class="grid-3">
      <div class="card">
        <h3 class="item-title">🥬 Daily Fresh Perishables</h3>
        <p style="font-size: 8pt;">
          Vegetables, onions, tomatoes, milk, paneer, curd, green chilies.<br>
          <strong>Rotation:</strong> Daily or alternate-day mandi restocking.
        </p>
      </div>

      <div class="card">
        <h3 class="item-title">🌾 Dry Staples & Grains</h3>
        <p style="font-size: 8pt;">
          Basmati rice, wheat flour (atta), toor dal, cooking oil, spices, salt.<br>
          <strong>Rotation:</strong> Weekly/monthly bulk wholesale procurement.
        </p>
      </div>

      <div class="card">
        <h3 class="item-title">📦 Consumables & Packaging</h3>
        <p style="font-size: 8pt;">
          Takeaway meal boxes, silver foil rolls, napkins, cleaning sanitizers.<br>
          <strong>Rotation:</strong> Bi-weekly restocks.
        </p>
      </div>
    </div>

    <h2 class="sub-title">2. Par Levels & Smart Low-Stock Warnings</h2>
    <div class="grid-2">
      <div class="card card-highlight">
        <h3 class="item-title" style="color: #ea580c;">Minimum Safety Thresholds (Par Levels)</h3>
        <p style="font-size: 8pt;">
          For every item, owners set a safety minimum (e.g., Minimum 25 kg of Cooking Oil, 40 kg of Rice). When stock dips below this limit, the item badge turns <strong>RED (Low Stock)</strong> on the dashboard, prompting immediate vendor reordering before lunch prep begins.
        </p>
      </div>

      <div class="card">
        <h3 class="item-title">Stock Inflow Logging</h3>
        <p style="font-size: 8pt;">
          When wholesale deliveries arrive, owners log incoming batches: <em>Item Name</em>, <em>Quantity Received</em>, <em>Cost Price</em>, and <em>Vendor Name</em>. The cost automatically flows into the Finance Ledger under <code>inventory_purchase</code>.
        </p>
      </div>
    </div>

    <h2 class="sub-title">3. The Automated Outflow Engine (Recipe-Based Consumption)</h2>
    <div class="formula">
Daily Ingredient Consumption = &Sigma; (Served Thalis &times; Standard Recipe Proportion) + Spoilage
Example (100 Paneer Thalis) = 15kg Rice + 10kg Dal + 6kg Paneer + 200 Rotis Atta
    </div>
    <p style="font-size: 8.5pt;">
      Whenever student QR passes are scanned at the counter, the system automatically decrements ingredients from pantry stock based on configured recipe ratios. This eliminates manual stock counting and prevents inventory pilferage.
    </p>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 8: STAFF MANAGEMENT & CUSTOM ROLES -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>👨‍🍳</span> Staff Management & Custom Roles</h1>

    <h2 class="sub-title">1. Personnel Directory & Shift Security (`/owner/staff`)</h2>
    <p>
      Mess personnel operate in high-intensity shifts. Messta gives owners granular role security, shift accountability, and PIN verification.
    </p>

    <div class="grid-2">
      <div class="card">
        <h3 class="item-title">Shift Windows & Rostering</h3>
        <ul>
          <li><strong>☀️ Morning Shift:</strong> 06:30 AM &ndash; 03:00 PM (Breakfast prep + Lunch service rush).</li>
          <li><strong>🌙 Evening Shift:</strong> 04:30 PM &ndash; 10:30 PM (Dinner prep + Service rush + Sanitation).</li>
          <li><strong>⚡ Full Day Service:</strong> Supervisory staff managing all operations.</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="item-title">Wage Structure Options</h3>
        <ul>
          <li><strong>Monthly Fixed Salary:</strong> For permanent staff (e.g., Head Chef @ ₹26,000/mo).</li>
          <li><strong>Daily Wage Rate:</strong> For helpers and cleaners (e.g., ₹450 &ndash; ₹600 / day).</li>
          <li><strong>Payroll Auto-Sync:</strong> Monthly wage totals feed directly into the Finance Module as labor overhead.</li>
        </ul>
      </div>
    </div>

    <h2 class="sub-title">2. Custom Role Creator (+ Add Role Feature)</h2>
    <p>
      Beyond standard system roles (Head Chef, Counter Operator, Delivery Partner), owners can create custom roles tailored to their outlet:
    </p>

    <table>
      <thead>
        <tr>
          <th>Custom Role</th>
          <th>Icon</th>
          <th>Typical Operational Responsibilities</th>
          <th>Default Permissions Enabled</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Front Desk / Cashier</strong></td>
          <td>🛎️</td>
          <td>Student check-ins, cash token top-ups, counter inquiries</td>
          <td>QR Scanner, Staff Check-in</td>
        </tr>
        <tr>
          <td><strong>Table & Floor Service</strong></td>
          <td>🍽️</td>
          <td>Dining hall seating, table clearance, drinking water refilling</td>
          <td>View Only (No system modifications)</td>
        </tr>
        <tr>
          <td><strong>Storekeeper & Pantry</strong></td>
          <td>📦</td>
          <td>Dry ration intake, vegetable weigh-ins, inventory audits</td>
          <td>Kitchen Inventory Management</td>
        </tr>
        <tr>
          <td><strong>Dishwashing & Sanitation</strong></td>
          <td>🧼</td>
          <td>Kitchen utensil cleaning, dish sanitization, waste disposal</td>
          <td>View Only (Daily wage tracking)</td>
        </tr>
      </tbody>
    </table>

    <div class="card card-emerald">
      <h3 class="item-title" style="color: #15803d;">Granular Permission Matrix</h3>
      <p style="font-size: 8.5pt; margin-bottom: 0;">
        Owners toggle specific checkboxes per role: <code>canScanQR</code>, <code>canManageInventory</code>, <code>canManageMeals</code>, <code>canViewFinance</code>, and <code>canManageStaff</code>. Counter staff cannot view financial profits, preventing sensitive data exposure.
      </p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 9: FINANCE & P&L INTELLIGENCE ENGINE -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>💰</span> Finance & P&L Intelligence Engine</h1>

    <h2 class="sub-title">1. The Double-Entry Automated Ledger (`/owner/finance`)</h2>
    <p>
      The finance engine unites all operational streams into an automated double-entry ledger:
    </p>

    <div class="formula">
Net Profit = Net Revenue - (Kitchen COGS + Staff Payroll + LPG & Power + Venue Rent + Repairs)
Target Standard: Gross Margin &ge; 50% | Net Profit Margin = 26% &ndash; 34% (Healthy)
    </div>

    <div class="grid-2">
      <div class="card card-emerald">
        <h3 class="item-title" style="color: #15803d;">Inflow Channels (Revenue)</h3>
        <ul>
          <li><strong>Subscriptions:</strong> ~80% of revenue from recurring student passes.</li>
          <li><strong>Per-Plate Meals:</strong> ~16% from walk-in diners and special dishes.</li>
          <li><strong>Counter Add-ons:</strong> ~4% from cash/UPI sweets, extra curd, and drinks.</li>
          <li><strong>Net Inflow:</strong> Programmatically deducts 2% + GST gateway charges.</li>
        </ul>
      </div>

      <div class="card card-highlight">
        <h3 class="item-title" style="color: #ea580c;">Outflow Channels (Expenses)</h3>
        <ul>
          <li><strong>Food COGS:</strong> Real-time consumption cost of raw ingredients.</li>
          <li><strong>Staff Payroll:</strong> Monthly salaries + daily shift wages.</li>
          <li><strong>LPG Gas & Utilities:</strong> 19kg commercial cylinders, electricity bills.</li>
          <li><strong>Venue Rent:</strong> Monthly mess hall lease.</li>
        </ul>
      </div>
    </div>

    <h2 class="sub-title">2. Per-Thali Unit Economics & Contribution Margins</h2>
    <table>
      <thead>
        <tr>
          <th>Thali Dish Name</th>
          <th>Selling Price</th>
          <th>Raw Material COGS</th>
          <th>Fuel & Labor Share</th>
          <th>Gross Margin %</th>
          <th>Contribution Margin</th>
          <th>Performance Rating</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Executive Paneer Thali</strong></td>
          <td>₹110</td>
          <td>₹44</td>
          <td>₹18 (₹6 gas + ₹12 labor)</td>
          <td><strong>60.0%</strong></td>
          <td><strong>+₹48</strong></td>
          <td><span class="badge badge-emerald">High Margin Star ⭐</span></td>
        </tr>
        <tr>
          <td><strong>Standard Veg Thali</strong></td>
          <td>₹85</td>
          <td>₹32</td>
          <td>₹18 (₹6 gas + ₹12 labor)</td>
          <td><strong>62.4%</strong></td>
          <td><strong>+₹35</strong></td>
          <td><span class="badge badge-emerald">Core Staple</span></td>
        </tr>
        <tr>
          <td><strong>Special Non-Veg Chicken Thali</strong></td>
          <td>₹145</td>
          <td>₹68</td>
          <td>₹20 (₹7 gas + ₹13 labor)</td>
          <td><strong>53.1%</strong></td>
          <td><strong>+₹57</strong></td>
          <td><span class="badge badge-orange">High Revenue</span></td>
        </tr>
        <tr>
          <td><strong>Student Lite Thali</strong></td>
          <td>₹65</td>
          <td>₹24</td>
          <td>₹15 (₹5 gas + ₹10 labor)</td>
          <td><strong>63.1%</strong></td>
          <td><strong>+₹26</strong></td>
          <td><span class="badge badge-blue">Budget Staple</span></td>
        </tr>
      </tbody>
    </table>

    <h2 class="sub-title">3. Break-Even Daily Plate Calculator</h2>
    <div class="card">
      <p style="font-size: 8.5pt;">
        <strong>Fixed Monthly Overhead:</strong> ₹48,000 (Rent ₹22k + Base Salaries ₹20k + Electricity ₹6k)<br>
        <strong>Average Contribution Margin:</strong> ₹36 per plate<br>
        <strong>Daily Break-Even Target:</strong> <strong>45 Plates / Day</strong> (1,350 plates/month) to cover all fixed expenses. Every plate served past 45 represents pure net profit.
      </p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- PAGE 10: USER WORKFLOW CHEATSHEET & FAQ -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="page">
    <h1 class="section-title"><span>⚡</span> Quick Reference Cheatsheet & Troubleshooting</h1>

    <h2 class="sub-title">Daily Operations Checklist for Mess Owners</h2>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Module</th>
          <th>Required Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>06:30 AM</strong></td>
          <td>Kitchen Inventory</td>
          <td>Inspect vegetable delivery, verify par levels for cooking oil and rice, log Mandi purchase.</td>
        </tr>
        <tr>
          <td><strong>07:00 AM</strong></td>
          <td>Thali Matrix</td>
          <td>Publish Today's Breakfast & Lunch Thalis, set capacity slots (e.g. 12:00-12:30, 12:30-1:00).</td>
        </tr>
        <tr>
          <td><strong>11:45 AM</strong></td>
          <td>Counter Scanner</td>
          <td>Cashier enters 4-digit PIN, verifies webcam scanner focus, reviews incoming slot reservations.</td>
        </tr>
        <tr>
          <td><strong>03:15 PM</strong></td>
          <td>Staff Roster</td>
          <td>Mark Morning Shift completion; review redemption audit count vs lunch headcount.</td>
        </tr>
        <tr>
          <td><strong>05:30 PM</strong></td>
          <td>Thali Matrix</td>
          <td>Confirm Evening Dinner Spread (Paneer/Chicken Specials); update night capacities.</td>
        </tr>
        <tr>
          <td><strong>10:30 PM</strong></td>
          <td>Finance Ledger</td>
          <td>Quick-add any daily cash expenses (LPG refills, tanker bills); review Day Net Margin %.</td>
        </tr>
      </tbody>
    </table>

    <h2 class="sub-title">Frequently Asked Questions & Troubleshooting</h2>
    <div class="card">
      <h3 class="item-title">Q: A student's QR code won't scan at the counter. What should the cashier do?</h3>
      <p style="font-size: 8pt;">
        <strong>A:</strong> 1) Ensure the student's phone screen brightness is set to high. 2) If the camera is blurred, the operator can manually enter the student's 6-character Pass Code (e.g., <code>PASS-7A8B</code>) into the counter fallback box to redeem 1 token instantly.
      </p>
    </div>

    <div class="card">
      <h3 class="item-title">Q: How do Razorpay / Stripe payouts reach the owner's bank account?</h3>
      <p style="font-size: 8pt;">
        <strong>A:</strong> Digital transactions collect in payment gateway escrow and batch-settle on a T+1 or T+2 business day schedule into the owner's registered bank account. View all cleared deposits and UTR reference numbers under <code>/owner/finance &rarr; Gateway Settlements</code>.
      </p>
    </div>

    <div class="card">
      <h3 class="item-title">Q: Can an owner manage two different messes with separate menus and staff?</h3>
      <p style="font-size: 8pt;">
        <strong>A:</strong> Yes! Use the top-left branch picker dropdown to toggle between outlets. Each mess maintains its own independent inventory, staff roster, meal spreads, and P&L financial ledgers.
      </p>
    </div>

    <div style="margin-top: 20px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 8pt; color: #94a3b8;">
      &copy; 2026 MESSTA Technologies Inc. All rights reserved. &bull; support@messta.com &bull; www.messta.com
    </div>
  </div>

</body>
</html>"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"HTML manual generated at: {html_path}")

    # Render PDF using Microsoft Edge Headless
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    edge_exe = next((p for p in edge_paths if os.path.exists(p)), None)

    if not edge_exe:
        print("Microsoft Edge not found. PDF creation requires Edge or Chrome.")
        return False

    cmd = [
        edge_exe,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={pdf_path}",
        "--no-pdf-header-footer",
        html_path
    ]

    print("Rendering PDF via headless Microsoft Edge...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"SUCCESS: PDF generated successfully: {pdf_path} ({size_kb:.1f} KB)")
        return True
    else:
        print("Edge PDF creation failed or produced empty file.")
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        return False

if __name__ == "__main__":
    success = generate_pdf()
    sys.exit(0 if success else 1)
