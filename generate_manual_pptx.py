import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    pptx_path = r"c:\Users\sachi\OneDrive\Desktop\MESSTA\MESSTA_Platform_Manual.pptx"
    logo_path = r"c:\Users\sachi\OneDrive\Desktop\MESSTA\frontend\src\assets\messta-logo.png"

    prs = Presentation()
    # 16:9 Widescreen slides
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]

    # Brand Colors
    ORANGE = RGBColor(234, 88, 12)       # #ea580c
    DARK = RGBColor(15, 23, 42)          # #0f172a
    LIGHT_BG = RGBColor(248, 250, 252)   # #f8fafc
    WHITE = RGBColor(255, 255, 255)
    GRAY_TEXT = RGBColor(71, 85, 105)    # #475569
    EMERALD = RGBColor(22, 163, 74)      # #16a34a
    CARD_BG = RGBColor(255, 255, 255)
    BORDER_COLOR = RGBColor(226, 232, 240)

    def add_bg(slide, color=LIGHT_BG):
        shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        shape.fill.solid()
        shape.fill.fore_color.rgb = color
        shape.line.fill.background()
        return shape

    def add_header(slide, title, category="MESSTA PLATFORM MANUAL"):
        # Header category tag
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(10), Inches(0.4))
        tf = tag_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = category.upper()
        p.font.name = "Calibri"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = ORANGE

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.5), Inches(0.8))
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = "Calibri"
        p.font.size = Pt(22)
        p.font.bold = True
        p.font.color.rgb = DARK

        # Top orange accent line
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), Inches(11.7), Inches(0.04))
        line.fill.solid()
        line.fill.fore_color.rgb = ORANGE
        line.line.fill.background()

    def add_card(slide, left, top, width, height, bg=CARD_BG, border=BORDER_COLOR):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = bg
        card.line.color.rgb = border
        card.line.width = Pt(1.5)
        return card

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 1: TITLE / COVER SLIDE
    # ─────────────────────────────────────────────────────────────────────────
    s1 = prs.slides.add_slide(blank_layout)
    add_bg(s1, RGBColor(255, 247, 237)) # warm orange-50

    # Decorative accent card
    card = add_card(s1, 0.8, 0.8, 11.733, 5.9, WHITE, RGBColor(254, 215, 170))

    if os.path.exists(logo_path):
        s1.shapes.add_picture(logo_path, Inches(1.4), Inches(1.3), height=Inches(1.0))

    tb = s1.shapes.add_textbox(Inches(1.4), Inches(2.5), Inches(10.5), Inches(3.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "OFFICIAL PLATFORM & OPERATIONS MANUAL"
    p0.font.name = "Calibri"
    p0.font.size = Pt(12)
    p0.font.bold = True
    p0.font.color.rgb = ORANGE
    p0.space_after = Pt(14)

    p1 = tf.add_paragraph()
    p1.text = "MESSTA: Smart Mess & Student Dining OS"
    p1.font.name = "Calibri"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = DARK
    p1.space_after = Pt(14)

    p2 = tf.add_paragraph()
    p2.text = "Comprehensive operating guide covering Student Dining Passes, Dual QR Redemptions, Real-Time Counter Scanning, Kitchen Inventory OS, Staff Rostering, and Automated Double-Entry Finance Intelligence."
    p2.font.name = "Calibri"
    p2.font.size = Pt(14)
    p2.font.color.rgb = GRAY_TEXT
    p2.space_after = Pt(28)

    p3 = tf.add_paragraph()
    p3.text = "Release: Enterprise v2.4  |  October 2026  |  Confidential Documentation"
    p3.font.name = "Calibri"
    p3.font.size = Pt(11)
    p3.font.bold = True
    p3.font.color.rgb = DARK

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 2: EXECUTIVE OVERVIEW & PROBLEM STATEMENT
    # ─────────────────────────────────────────────────────────────────────────
    s2 = prs.slides.add_slide(blank_layout)
    add_bg(s2)
    add_header(s2, "Executive Overview: Transforming Campus Dining")

    # Column 1: The Problem
    add_card(s2, 0.8, 1.8, 5.7, 5.0, WHITE)
    tb = s2.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "❌ The Legacy Mess Challenges"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = RGBColor(185, 28, 28)
    p.space_after = Pt(14)

    points = [
        ("Paper Registers & Manual Tokens", "Prone to student fraud, pass sharing, and lost physical registers."),
        ("Dining Hall Bottlenecks", "Massive uncoordinated rushes during peak lunch and dinner hours."),
        ("Food & Raw Material Wastage", "Cooking quantities based on guesswork without knowing exact daily student turnout."),
        ("Untracked Inventory Leakage", "Vegetable and ration purchases vanish without automated recipe-based deduction."),
        ("Financial Blind Spots", "Mess owners rarely know true net profit after gas, rent, labor, and grocery costs.")
    ]
    for title, desc in points:
        p = tf.add_paragraph()
        p.text = f"• {title}: {desc}"
        p.font.size = Pt(11)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(8)

    # Column 2: The Solution
    add_card(s2, 6.8, 1.8, 5.7, 5.0, RGBColor(240, 253, 244), RGBColor(187, 247, 208))
    tb = s2.shapes.add_textbox(Inches(7.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "✅ The Messta Unified Solution"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p.space_after = Pt(14)

    sol_points = [
        ("Dual Dynamic QR Passes", "Rolling, expiring QR codes preventing screenshots and pass fraud."),
        ("Slot Capacity Reservation", "30-min seating limits preventing dining hall overcrowding."),
        ("Real-Time Kitchen OS", "Ingredient deduction triggered programmatically as meals are served."),
        ("Staff Security & Rostering", "4-digit PIN verification per shift with custom role permissions."),
        ("Double-Entry Finance Ledger", "Live P&L calculating exact revenue, COGS, labor, and net margin %.")
    ]
    for title, desc in sol_points:
        p = tf.add_paragraph()
        p.text = f"• {title}: {desc}"
        p.font.size = Pt(11)
        p.font.color.rgb = DARK
        p.space_after = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 3: STUDENT DINING & DUAL QR PASSES
    # ─────────────────────────────────────────────────────────────────────────
    s3 = prs.slides.add_slide(blank_layout)
    add_bg(s3)
    add_header(s3, "Student Experience & Dual QR Architecture", "MODULE 1 & 2")

    add_card(s3, 0.8, 1.8, 5.7, 5.0, WHITE)
    tb = s3.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🎟️ Path A: Membership Token Pass"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = ORANGE
    p.space_after = Pt(12)

    p_body = [
        "• Target Diner: Enrolled hostellers with monthly/semester plans (30-90 tokens).",
        "• Meal Frequency: 1 to 2 meals per day (Lunch + Dinner).",
        "• QR Behavior: Multi-use declining balance (e.g. 58 / 60 Remaining).",
        "• Slot Reservation: Student picks 12:30-1:00 PM interval to reserve seat.",
        "• Counter Action: Scans at counter &rarr; Deducts exactly 1 token &rarr; Marks served.",
        "• Auto-Renewal: Alerts student when token balance reaches 4 remaining tokens."
    ]
    for b in p_body:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(11)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(8)

    add_card(s3, 6.8, 1.8, 5.7, 5.0, WHITE)
    tb = s3.shapes.add_textbox(Inches(7.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🍽️ Path B: Per-Plate Meal Ticket"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = RGBColor(37, 99, 235)
    p.space_after = Pt(12)

    p_body2 = [
        "• Target Diner: Day scholars, casual campus visitors, or guest plates.",
        "• Special Dishes: Sunday Special Chicken/Paneer Thalis ordered on demand.",
        "• Payment: Instant online checkout via UPI, Cards, or Netbanking.",
        "• QR Behavior: Single-use event ticket tied to specific date & meal slot.",
        "• Counter Action: Scans at counter &rarr; Validates date/slot &rarr; Transitions to 'redeemed'.",
        "• Cross-Category Match: Allows Veg pass students to buy Non-Veg specials separately."
    ]
    for b in p_body2:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(11)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 4: OWNER DASHBOARD & LIVE COUNTER SCANNER
    # ─────────────────────────────────────────────────────────────────────────
    s4 = prs.slides.add_slide(blank_layout)
    add_bg(s4)
    add_header(s4, "Owner Dashboard & Counter Scanner (/owner)", "MODULE 3")

    # 3 Feature Cards
    add_card(s4, 0.8, 1.8, 3.64, 5.0, WHITE)
    tb = s4.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(3.24), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "📱 Camera QR Scanner"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = DARK
    p.space_after = Pt(10)
    for b in [
        "• Hardware Agnostic: Operates on mobile phone, tablet, or webcam.",
        "• Instant Verification: Sub-second redemption check with live feedback.",
        "• Green Flash: Valid meal pass with student details.",
        "• Red Buzzer: Invalid or already redeemed token alert."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(10.5)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(6)

    add_card(s4, 4.84, 1.8, 3.64, 5.0, WHITE)
    tb = s4.shapes.add_textbox(Inches(5.04), Inches(2.0), Inches(3.24), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🔐 4-Digit Staff PIN"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = DARK
    p.space_after = Pt(10)
    for b in [
        "• Security Checkpoint: Cashier enters 4-digit PIN before scanning starts.",
        "• Shift Accountability: Every scan records scannedByStaffId and shift block.",
        "• Zero Pass Theft: Unauthenticated operators cannot deduct meals.",
        "• Shift Audits: Cross-checks cash collection vs meals served."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(10.5)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(6)

    add_card(s4, 8.88, 1.8, 3.64, 5.0, WHITE)
    tb = s4.shapes.add_textbox(Inches(9.08), Inches(2.0), Inches(3.24), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🏢 Multi-Outlet Control"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = DARK
    p.space_after = Pt(10)
    for b in [
        "• Branch Switcher: Top dropdown toggles between mess outlets.",
        "• Independent Context: Each outlet keeps isolated menus, stock, and staff.",
        "• Add New Branch: 1-click modal to register new mess location.",
        "• Branch Deletion: Safely delete or decommission inactive outlets."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(10.5)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(6)

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 5: THALI MATRIX & PRICING
    # ─────────────────────────────────────────────────────────────────────────
    s5 = prs.slides.add_slide(blank_layout)
    add_bg(s5)
    add_header(s5, "Thali Matrix & Operational Spreads (/owner/meals)", "MODULE 4")

    add_card(s5, 0.8, 1.8, 5.7, 5.0, WHITE)
    tb = s5.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🍱 Operational Spreads Architecture"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = ORANGE
    p.space_after = Pt(12)
    for b in [
        "• Structured Operational Windows: Spreads define service intervals.",
        "• Breakfast Spread (07:30 - 10:30 AM): Poha, Parathas, Tea/Coffee.",
        "• Lunch Spread (12:00 - 03:00 PM): Core thalis with 30-min seat intervals.",
        "• Dinner Spread (07:30 - 10:30 PM): Night service with daily specials.",
        "• '+ Add Spread' Button: Owners can add custom spreads (e.g. Evening Snacks or Sunday Feast) with customized hours.",
        "• Interval Seating Limit: Prevents overcrowding in mess hall."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(11)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(8)

    add_card(s5, 6.8, 1.8, 5.7, 5.0, RGBColor(255, 247, 237), RGBColor(254, 215, 170))
    tb = s5.shapes.add_textbox(Inches(7.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🔗 The Crucial Link: Membership Mapping"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = DARK
    p.space_after = Pt(12)
    for b in [
        "• Tier Tagging: When creating thalis, owners map them to eligible membership tiers.",
        "• Token Coverage: Veg Thali is covered natively by Veg / Lite passes.",
        "• Cross-Category Mismatch: If a Veg pass holder wants a Non-Veg plate, system routes them to pay ₹140 online.",
        "• Dynamic Daily Pricing: Adjust per-plate pricing based on festival menus or seasonal specials.",
        "• Live Kitchen Count: Display remaining capacity directly to student app."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(11)
        p.font.color.rgb = DARK
        p.space_after = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 6: KITCHEN INVENTORY OS
    # ─────────────────────────────────────────────────────────────────────────
    s6 = prs.slides.add_slide(blank_layout)
    add_bg(s6)
    add_header(s6, "Kitchen Inventory & Raw Material OS (/owner/inventory)", "MODULE 5")

    add_card(s6, 0.8, 1.8, 3.64, 5.0, WHITE)
    tb = s6.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(3.24), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🥦 Ingredient Master"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = DARK
    p.space_after = Pt(10)
    for b in [
        "• Perishables: Tomatoes, onions, milk, paneer, vegetables (daily mandi).",
        "• Dry Staples: Basmati rice, atta, toor dal, cooking oil, spices.",
        "• Consumables: Foil rolls, meal takeaway boxes, cleaning supplies.",
        "• Units: Tracked in KG, Litres, Grams, and Packets."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(10.5)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(6)

    add_card(s6, 4.84, 1.8, 3.64, 5.0, WHITE)
    tb = s6.shapes.add_textbox(Inches(5.04), Inches(2.0), Inches(3.24), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "⚠️ Par Levels & Alerts"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = DARK
    p.space_after = Pt(10)
    for b in [
        "• Safety Thresholds: Minimum stock level (e.g. Min 30kg rice, 20L oil).",
        "• Low-Stock Badge: Turns RED when stock falls below par level.",
        "• Restock Purchases: Log vendor name, bill amount, batch quantity.",
        "• Finance Flow: Purchases automatically enter the Finance Ledger."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(10.5)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(6)

    add_card(s6, 8.88, 1.8, 3.64, 5.0, RGBColor(240, 253, 244), RGBColor(187, 247, 208))
    tb = s6.shapes.add_textbox(Inches(9.08), Inches(2.0), Inches(3.24), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "⚡ Auto Recipe COGS"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p.space_after = Pt(10)
    for b in [
        "• Scanned Meal Link: When student scans QR pass, recipe ratios deduct automatically.",
        "• 1 Thali Consumption = 150g rice + 100g dal + 50g paneer + 2 rotis.",
        "• Live Real-Time COGS: Tracks cost of raw materials served daily.",
        "• Zero Pilferage: Eliminates pantry leakage and theft."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(10.5)
        p.font.color.rgb = DARK
        p.space_after = Pt(6)

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 7: STAFF MANAGEMENT & CUSTOM ROLES
    # ─────────────────────────────────────────────────────────────────────────
    s7 = prs.slides.add_slide(blank_layout)
    add_bg(s7)
    add_header(s7, "Staff Management & Custom Roles (/owner/staff)", "MODULE 6")

    add_card(s7, 0.8, 1.8, 5.7, 5.0, WHITE)
    tb = s7.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "👥 Shift Rostering & Security"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = ORANGE
    p.space_after = Pt(12)
    for b in [
        "• Shift Blocks: Morning Prep (06:30-15:00), Evening Rush (16:30-22:30), Full Day.",
        "• Wage Structures: Monthly Fixed Salary (e.g. ₹26,000/mo) or Daily Wage (₹500/day).",
        "• 4-Digit PIN Access: Each staff member gets a PIN to unlock counter scanning.",
        "• Roster Auditing: Logs which employee served which student token.",
        "• Payroll Auto-Sync: Feeds labor overheads directly into Finance books."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(11)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(8)

    add_card(s7, 6.8, 1.8, 5.7, 5.0, RGBColor(243, 232, 255), RGBColor(216, 180, 254))
    tb = s7.shapes.add_textbox(Inches(7.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🏷️ '+ Add Role' Feature (Custom Roles)"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = RGBColor(126, 34, 206)
    p.space_after = Pt(12)
    for b in [
        "• Quick 1-Click Templates: Desk Job / Reception, Table Service, Sanitation, Storekeeper.",
        "• Granular Permissions: Toggle canScanQR, canManageInventory, canManageMeals, canViewFinance, canManageStaff.",
        "• Filter Chips: Custom roles instantly appear in staff directory filter bar.",
        "• Hire Modal Presets: Clicking a custom role auto-fills shift, wage, and permissions.",
        "• Safe Role Deletion: Delete or reconfigure roles at any time."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(11)
        p.font.color.rgb = DARK
        p.space_after = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 8: FINANCE & P&L INTELLIGENCE
    # ─────────────────────────────────────────────────────────────────────────
    s8 = prs.slides.add_slide(blank_layout)
    add_bg(s8)
    add_header(s8, "Finance & P&L Intelligence Engine (/owner/finance)", "MODULE 7")

    # 4 Metric Summary Boxes
    box_w = 2.75
    gap = 0.24
    cards_data = [
        ("💰 NET REVENUE", "₹1,49,904", "Gross ₹1.53L - 2.36% Gateway Fees", EMERALD),
        ("📉 OPERATING COSTS", "₹1,04,100", "COGS + Labor + Rent + Power", RGBColor(225, 29, 72)),
        ("🚀 REAL NET PROFIT", "+₹45,804", "+ Profit 🚀 (Positive Net Return)", EMERALD),
        ("📊 NET MARGIN %", "+30.6%", "Healthy 🌟 (Benchmark: 22%-32%)", EMERALD),
    ]
    for idx, (label, val, sub, col) in enumerate(cards_data):
        left = 0.8 + idx * (box_w + gap)
        add_card(s8, left, 1.8, box_w, 1.5, WHITE)
        tb = s8.shapes.add_textbox(Inches(left + 0.15), Inches(1.9), Inches(box_w - 0.3), Inches(1.3))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = label
        p.font.size = Pt(9)
        p.font.bold = True
        p.font.color.rgb = GRAY_TEXT
        
        p = tf.add_paragraph()
        p.text = val
        p.font.size = Pt(18)
        p.font.bold = True
        p.font.color.rgb = col
        
        p = tf.add_paragraph()
        p.text = sub
        p.font.size = Pt(8)
        p.font.color.rgb = GRAY_TEXT

    # Lower 2 Cards
    add_card(s8, 0.8, 3.6, 5.7, 3.2, WHITE)
    tb = s8.shapes.add_textbox(Inches(1.0), Inches(3.75), Inches(5.3), Inches(2.9))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🍱 Thali Unit Economics & Break-Even"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = DARK
    p.space_after = Pt(8)
    for b in [
        "• Executive Paneer Thali: Sells @ ₹110 &rarr; COGS ₹44 + Gas/Labor ₹18 &rarr; Margin 60.0% (+₹48).",
        "• Standard Veg Thali: Sells @ ₹85 &rarr; COGS ₹32 + Gas/Labor ₹18 &rarr; Margin 62.4% (+₹35).",
        "• Special Non-Veg Thali: Sells @ ₹145 &rarr; COGS ₹68 + Gas/Labor ₹20 &rarr; Margin 53.1% (+₹57).",
        "• Daily Break-Even: Target 45 Plates / Day to clear fixed costs of ₹48,000/mo."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(10)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(4)

    add_card(s8, 6.8, 3.6, 5.7, 3.2, WHITE)
    tb = s8.shapes.add_textbox(Inches(7.0), Inches(3.75), Inches(5.3), Inches(2.9))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "📜 Ledger & Quick Expense Logger"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = DARK
    p.space_after = Pt(8)
    for b in [
        "• 1-Click Quick Expense Presets: Commercial LPG 19kg (₹1,950), Electricity, Rent, Repairs.",
        "• Searchable Double-Entry Table: Filter by Inflows, Outflows, or Category.",
        "• 1-Click CSV Tax Export: Download accountant-ready P&L spreadsheet.",
        "• Bank Settlements Escrow: Track Razorpay/Stripe cleared payouts with UTR numbers."
    ]:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = Pt(10)
        p.font.color.rgb = GRAY_TEXT
        p.space_after = Pt(4)

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 9: DAILY OPERATIONAL CHEATSHEET
    # ─────────────────────────────────────────────────────────────────────────
    s9 = prs.slides.add_slide(blank_layout)
    add_bg(s9)
    add_header(s9, "Daily Operating Cheatsheet for Mess Owners & Staff", "OPERATIONS")

    schedule = [
        ("06:30 AM", "Kitchen Pantry Audit", "Inspect morning vegetable intake, check par levels for rice and oil, log Mandi cash bill."),
        ("07:00 AM", "Publish Daily Spreads", "Verify Today's Breakfast & Lunch Thalis in /owner/meals, set seating capacity limits."),
        ("11:45 AM", "Counter Station Sign-In", "Cashier enters 4-digit PIN, tests webcam QR scanner, reviews incoming slot reservations."),
        ("03:15 PM", "Post-Lunch Reconciliation", "Check redeemed meal counts vs actual food consumption; verify helper shift hours."),
        ("05:30 PM", "Dinner Spread Setup", "Confirm Special Thalis (Paneer / Non-Veg); verify evening capacity limits."),
        ("10:30 PM", "Night Ledger Settlement", "Log daily commercial LPG or power bills in /owner/finance; verify day's positive net profit.")
    ]

    for idx, (time_val, task, desc) in enumerate(schedule):
        top = 1.8 + idx * 0.85
        card = add_card(s9, 0.8, top, 11.733, 0.75, WHITE)
        tb = s9.shapes.add_textbox(Inches(1.0), Inches(top + 0.1), Inches(11.3), Inches(0.55))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = f"{time_val}  |  {task}:  {desc}"
        p.font.name = "Calibri"
        p.font.size = Pt(11)
        p.font.bold = False
        p.font.color.rgb = DARK

    # ─────────────────────────────────────────────────────────────────────────
    # SLIDE 10: CONCLUSION & SUMMARY
    # ─────────────────────────────────────────────────────────────────────────
    s10 = prs.slides.add_slide(blank_layout)
    add_bg(s10, DARK)

    tb = s10.shapes.add_textbox(Inches(1.5), Inches(1.8), Inches(10.3), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "MESSTA: SMART MESS OPERATING SYSTEM"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ORANGE
    p.space_after = Pt(16)

    p = tf.add_paragraph()
    p.text = "Everything in One Cohesive Ecosystem"
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.space_after = Pt(20)

    p = tf.add_paragraph()
    p.text = "• Zero physical token loss  •  Zero dining hall stampedes  •  Zero untracked inventory leakage  •  Automated double-entry net profit intelligence."
    p.font.size = Pt(13)
    p.font.color.rgb = RGBColor(203, 213, 225)
    p.space_after = Pt(36)

    p = tf.add_paragraph()
    p.text = "Documentation and manuals ready for distribution to staff, partners, and college administrations."
    p.font.size = Pt(11)
    p.font.color.rgb = RGBColor(148, 163, 184)

    prs.save(pptx_path)
    size_kb = os.path.getsize(pptx_path) / 1024
    print(f"SUCCESS: PowerPoint Presentation generated successfully: {pptx_path} ({size_kb:.1f} KB)")
    return True

if __name__ == "__main__":
    create_deck()
