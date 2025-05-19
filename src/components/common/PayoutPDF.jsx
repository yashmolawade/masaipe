import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#999',
    paddingBottom: 10,
  },
  logo: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoMasa: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3333',
  },
  logoI: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3333',
  },
  logoPe: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  total: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: '#999',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#666',
    fontSize: 10,
  },
});

const PayoutPDF = ({ session, payoutDetails }) => {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoMasa}>masa</Text>
            <Text style={styles.logoI}>i</Text>
            <Text style={styles.logoPe}>pe</Text>
          </View>
          <Text>Generated on: {formatDate(Date.now())}</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>Session Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Mentor Email:</Text>
            <Text style={styles.value}>{session.mentorEmail}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Session Date:</Text>
            <Text style={styles.value}>{formatDate(session.date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Session Type:</Text>
            <Text style={styles.value}>{session.sessionType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duration:</Text>
            <Text style={styles.value}>{session.duration} minutes</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Rate per Hour:</Text>
            <Text style={styles.value}>${session.ratePerHour}/hour</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>Payment Breakdown</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Gross Amount:</Text>
            <Text style={styles.value}>${payoutDetails.grossAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>GST (8.75%):</Text>
            <Text style={styles.value}>-${payoutDetails.gst.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Taxes (15%):</Text>
            <Text style={styles.value}>-${payoutDetails.taxes.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Platform Fee (5%):</Text>
            <Text style={styles.value}>-${payoutDetails.platformFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.row, styles.total]}>
            <Text style={[styles.label, { fontSize: 14 }]}>Net Payable Amount:</Text>
            <Text style={[styles.value, { fontSize: 14 }]}>${payoutDetails.netAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>This is an automatically generated payout document.</Text>
          <Text>masaipe © {new Date().getFullYear()}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PayoutPDF; 