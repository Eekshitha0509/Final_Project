# applications/pdf_generator.py
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from io import BytesIO
from django.core.mail import EmailMessage
from django.conf import settings
from datetime import datetime

def generate_room_allotment_pdf(booking, student_data, payment):
    """Generate PDF for room allotment"""
    buffer = BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#002147'),
        alignment=1,
        spaceAfter=30
    )
    
    heading_style = ParagraphStyle(
        'HeadingStyle',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#003366'),
        spaceAfter=10
    )
    
    # Header
    elements.append(Paragraph("ANDHRA UNIVERSITY", title_style))
    elements.append(Paragraph("A.U. COLLEGE OF ENGINEERING (A)", styles['Heading2']))
    elements.append(Paragraph("SELF-SUPPORT HOSTELS (BOYS)", styles['Heading3']))
    elements.append(Spacer(1, 20))
    
    # Title
    elements.append(Paragraph("ROOM ALLOTMENT CERTIFICATE", title_style))
    elements.append(Spacer(1, 20))
    
    # Student Details
    elements.append(Paragraph("STUDENT DETAILS", heading_style))
    
    student_table_data = [
        ["Student Name:", student_data.full_name if hasattr(student_data, 'full_name') else booking.student.get_full_name()],
        ["Admission No:", student_data.admission_no if hasattr(student_data, 'admission_no') else ''],
        ["Registration No:", student_data.reg_no if hasattr(student_data, 'reg_no') else ''],
        ["Branch:", student_data.branch if hasattr(student_data, 'branch') else ''],
        ["Year:", student_data.class_yr if hasattr(student_data, 'class_yr') else ''],
        ["Email:", booking.student.email],
        ["Mobile:", student_data.mobile if hasattr(student_data, 'mobile') else ''],
    ]
    
    student_table = Table(student_table_data, colWidths=[2*inch, 4*inch])
    student_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(student_table)
    elements.append(Spacer(1, 20))
    
    # Room Allotment Details
    elements.append(Paragraph("ROOM ALLOTMENT DETAILS", heading_style))
    
    room_table_data = [
        ["Hostel Block:", booking.room.floor.block.display_name],
        ["Room Number:", booking.room.room_number],
        ["Room Type:", booking.room.get_room_type_display()],
        ["Floor:", f"Floor {booking.room.floor.floor_number}"],
        ["Price per Semester:", f"₹ {booking.room.price_per_semester}"],
    ]
    
    room_table = Table(room_table_data, colWidths=[2*inch, 4*inch])
    room_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(room_table)
    elements.append(Spacer(1, 20))
    
    # Payment Details
    elements.append(Paragraph("PAYMENT DETAILS", heading_style))
    
    payment_table_data = [
        ["Transaction ID:", payment.transaction_id or payment.razorpay_payment_id],
        ["Amount Paid:", f"₹ {payment.amount}"],
        ["Payment Date:", payment.payment_date.strftime("%d-%m-%Y %H:%M:%S")],
        ["Payment Status:", payment.payment_status.upper()],
    ]
    
    payment_table = Table(payment_table_data, colWidths=[2*inch, 4*inch])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 30))
    
    # Footer
    elements.append(Paragraph("This is a system generated certificate.", styles['Italic']))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Chief Warden", styles['Normal']))
    elements.append(Paragraph("Andhra University Hostels", styles['Normal']))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}", styles['Italic']))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer

def send_room_allotment_email(booking, student_data, payment, user_email, student_name):
    """Send room allotment PDF via email"""
    pdf_buffer = generate_room_allotment_pdf(booking, student_data, payment)
    
    subject = f"Room Allotment Confirmation - Room {booking.room.room_number}"
    message = f"""
Dear {student_name},

Congratulations! Your room has been successfully allotted.

Allotment Details:
-------------------
Student Name: {student_name}
Hostel Block: {booking.room.floor.block.display_name}
Room Number: {booking.room.room_number}
Room Type: {booking.room.get_room_type_display()}
Amount Paid: ₹ {payment.amount}
Transaction ID: {payment.transaction_id or payment.razorpay_payment_id}

Please find attached your Room Allotment Certificate.

For any queries, contact the hostel office.

Best Regards,
Andhra University Hostel Management
"""
    
    email = EmailMessage(
        subject,
        message,
        settings.EMAIL_HOST_USER,
        [user_email],
    )
    email.attach(f"Room_Allotment_{booking.student.username}.pdf", pdf_buffer.getvalue(), 'application/pdf')
    email.send()
    
    return True