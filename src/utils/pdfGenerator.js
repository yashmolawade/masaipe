import { jsPDF } from "jspdf";
import { PAYMENT_STATUS } from "../types/index";

export const generatePdf = (payout) => {
  // Create new PDF document
  const doc = new jsPDF();

  // Set font
  doc.setFont("helvetica");

  // Add masaipe logo/header
  doc.setFontSize(24);
  // Add "masa" in black
  doc.setTextColor(0, 0, 0);
  doc.text("masa", 90, 20);
  // Add "i" in red
  doc.setTextColor(255, 51, 51);
  doc.text("i", 108, 20);
  // Add "pay" in black
  doc.setTextColor(0, 0, 0);
  doc.text("pay", 112, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("Payment Receipt", 105, 30, { align: "center" });

  // Add receipt details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Date and ID
  doc.text(`Receipt ID: ${payout.id}`, 20, 45);
  doc.text(`Date: ${new Date(payout.createdAt).toLocaleDateString()}`, 20, 52);

  if (payout.status === PAYMENT_STATUS.PAID && payout.paidDate) {
    doc.text(
      `Payment Date: ${new Date(payout.paidDate).toLocaleDateString()}`,
      20,
      59
    );
  }

  // Mentor info
  doc.setFontSize(12);
  doc.text("Mentor Information", 20, 70);

  doc.setFontSize(10);
  doc.text(`Email: ${payout.mentorEmail}`, 20, 77);

  // Payment details
  doc.setFontSize(12);
  doc.text("Payment Breakdown", 20, 90);

  doc.setFontSize(10);
  doc.line(20, 95, 190, 95);
  doc.text("Description", 20, 102);
  doc.text("Amount", 170, 102, { align: "right" });
  doc.line(20, 105, 190, 105);

  let yPos = 112;

  // Gross amount
  doc.text("Gross Amount", 20, yPos);
  doc.text(`$${payout.grossAmount.toFixed(2)}`, 170, yPos, { align: "right" });
  yPos += 7;

  // GST
  doc.text("GST (8.75%)", 20, yPos);
  doc.text(`- $${payout.gst.toFixed(2)}`, 170, yPos, { align: "right" });
  yPos += 7;

  // Taxes
  doc.text("Taxes (15%)", 20, yPos);
  doc.text(`- $${payout.taxes.toFixed(2)}`, 170, yPos, { align: "right" });
  yPos += 7;

  // Platform fee
  doc.text("Platform Fee (5%)", 20, yPos);
  doc.text(`- $${payout.platformFee.toFixed(2)}`, 170, yPos, {
    align: "right",
  });
  yPos += 7;

  // Net amount
  doc.line(20, yPos, 190, yPos);
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Net Amount", 20, yPos);
  doc.text(`$${payout.netAmount.toFixed(2)}`, 170, yPos, { align: "right" });
  doc.setFont("helvetica", "normal");

  // Payment status
  yPos += 15;
  const statusText = `Payment Status: ${
    payout.status === PAYMENT_STATUS.PAID
      ? "Paid"
      : payout.status === PAYMENT_STATUS.PENDING
      ? "Pending"
      : "Under Review"
  }`;
  doc.text(statusText, 105, yPos, { align: "center" });

  // Footer
  doc.setFontSize(8);
  doc.text(
    "This is an automatically generated receipt. For questions, please contact admin.",
    105,
    280,
    { align: "center" }
  );

  // Save the PDF
  doc.save(`MentorPay_Receipt_${payout.id.substring(0, 8)}.pdf`);
};

export const generateCumulativePdf = (payouts, dateRange) => {
  // Create new PDF document
  const doc = new jsPDF();

  // Set font
  doc.setFont("helvetica");

  // Add masaipe logo/header for cumulative report
  doc.setFontSize(24);
  // Add "masa" in black
  doc.setTextColor(0, 0, 0);
  doc.text("masa", 90, 20);
  // Add "i" in red
  doc.setTextColor(255, 51, 51);
  doc.text("i", 108, 20);
  // Add "pay" in black
  doc.setTextColor(0, 0, 0);
  doc.text("pay", 112, 20);

  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text("Cumulative Payment Report", 105, 30, { align: "center" });

  // Add report details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Date Range
  doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 20, 45);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 52);

  // Summary
  doc.setFontSize(12);
  doc.text("Payment Summary", 20, 65);

  doc.setFontSize(10);
  doc.line(20, 70, 190, 70);

  // Calculate totals
  const totals = payouts.reduce(
    (acc, payout) => ({
      grossAmount: acc.grossAmount + (payout.grossAmount || 0),
      gst: acc.gst + (payout.gst || 0),
      taxes: acc.taxes + (payout.taxes || 0),
      platformFee: acc.platformFee + (payout.platformFee || 0),
      netAmount: acc.netAmount + (payout.netAmount || 0),
    }),
    {
      grossAmount: 0,
      gst: 0,
      taxes: 0,
      platformFee: 0,
      netAmount: 0,
    }
  );

  // Display totals
  let yPos = 80;

  doc.text(`Total Gross Amount: $${totals.grossAmount.toFixed(2)}`, 20, yPos);
  yPos += 7;
  doc.text(`Total GST (8.75%): $${totals.gst.toFixed(2)}`, 20, yPos);
  yPos += 7;
  doc.text(`Total Taxes (15%): $${totals.taxes.toFixed(2)}`, 20, yPos);
  yPos += 7;
  doc.text(
    `Total Platform Fee (5%): $${totals.platformFee.toFixed(2)}`,
    20,
    yPos
  );
  yPos += 7;
  doc.text(`Total Net Amount: $${totals.netAmount.toFixed(2)}`, 20, yPos, {
    align: "left",
  });

  // Payment Details Table
  yPos += 20;
  doc.setFontSize(12);
  doc.text("Payment Details", 20, yPos);

  yPos += 10;
  doc.setFontSize(8);
  doc.line(20, yPos, 190, yPos);

  // Table headers
  const headers = [
    "Date",
    "Mentor",
    "Gross",
    "GST",
    "Taxes",
    "Fee",
    "Net",
    "Status",
  ];
  const colWidths = [25, 45, 20, 20, 20, 20, 20, 20];
  let xPos = 20;

  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5);
    xPos += colWidths[i];
  });

  yPos += 10;
  doc.line(20, yPos, 190, yPos);

  // Table content
  payouts.forEach((payout, index) => {
    if (yPos > 250) {
      // Add new page if needed
      doc.addPage();
      yPos = 20;
      doc.line(20, yPos, 190, yPos);
      xPos = 20;
      headers.forEach((header, i) => {
        doc.text(header, xPos, yPos + 5);
        xPos += colWidths[i];
      });
      yPos += 10;
      doc.line(20, yPos, 190, yPos);
    }

    xPos = 20;
    doc.text(new Date(payout.createdAt).toLocaleDateString(), xPos, yPos + 5);
    xPos += colWidths[0];

    // Truncate email if too long
    const email =
      payout.mentorEmail.length > 20
        ? payout.mentorEmail.substring(0, 17) + "..."
        : payout.mentorEmail;
    doc.text(email, xPos, yPos + 5);
    xPos += colWidths[1];

    doc.text(`$${payout.grossAmount.toFixed(2)}`, xPos, yPos + 5);
    xPos += colWidths[2];

    doc.text(`$${payout.gst.toFixed(2)}`, xPos, yPos + 5);
    xPos += colWidths[3];

    doc.text(`$${payout.taxes.toFixed(2)}`, xPos, yPos + 5);
    xPos += colWidths[4];

    doc.text(`$${payout.platformFee.toFixed(2)}`, xPos, yPos + 5);
    xPos += colWidths[5];

    doc.text(`$${payout.netAmount.toFixed(2)}`, xPos, yPos + 5);
    xPos += colWidths[6];

    doc.text(payout.status, xPos, yPos + 5);

    yPos += 10;
    if (index < payouts.length - 1) {
      doc.setDrawColor(200);
      doc.line(20, yPos, 190, yPos);
      doc.setDrawColor(0);
    }
  });

  // Final line
  doc.line(20, yPos, 190, yPos);

  // Footer
  doc.setFontSize(8);
  doc.text(
    "This is an automatically generated cumulative report. For questions, please contact admin.",
    105,
    280,
    { align: "center" }
  );

  // Save the PDF
  const fileName = `MentorPay_Cumulative_${dateRange.start}_to_${dateRange.end}.pdf`;
  doc.save(fileName);
};
