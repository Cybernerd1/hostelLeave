/**
 * Absence Report Export Service
 *
 * Provides functionality to export absence monitoring data to CSV format.
 */

import type { StudentAbsenceRecord, HostelAbsenceStatistics, AbsenceMetrics } from './absence.service';

interface ExportOptions {
  date: string;
  hostelName?: string;
  tabName: string;
  includeMetrics?: boolean;
  includeHostelStats?: boolean;
}

class AbsenceExportService {
  /**
   * Generate CSV content from student records
   */
  private generateStudentCSV(
    records: StudentAbsenceRecord[],
    options: ExportOptions,
  ): string {
    const lines: string[] = [];

    // Header with metadata
    lines.push(`"Hostel Presence & Absence Report"`);
    lines.push(`"Date: ${new Date(options.date).toLocaleDateString('en-IN')}"`);
    if (options.hostelName) {
      lines.push(`"Hostel: ${options.hostelName}"`);
    }
    lines.push(`"Category: ${this.formatTabName(options.tabName)}"`);
    lines.push(`"Exported: ${new Date().toLocaleString('en-IN')}"`);
    lines.push(''); // Empty line for readability

    // Column headers
    const headers = [
      'Student Name',
      'Roll Number',
      'Hostel',
      'Room',
      'Phone',
      'Exit Date/Time',
      'Expected Return',
      'Return Date/Time',
      'Gate Pass No.',
      'Leave Status',
      'Presence Status',
      'Overdue Duration',
    ];
    lines.push(this.escapeCSV(headers.join(',')));

    // Data rows
    for (const record of records) {
      const row = [
        record.name,
        record.rollNumber,
        record.hostelName || '-',
        record.roomNumber || '-',
        record.phone || '-',
        record.exitTimestamp ? new Date(record.exitTimestamp).toLocaleString('en-IN') : '-',
        record.expectedReturnTimestamp ? new Date(record.expectedReturnTimestamp).toLocaleString('en-IN') : '-',
        record.returnTimestamp ? new Date(record.returnTimestamp).toLocaleString('en-IN') : '-',
        record.gatePassNumber || '-',
        record.leaseStatus || '-',
        this.formatPresenceStatus(record.presenceStatus),
        record.overdueDuration || '-',
      ];
      lines.push(this.escapeCSV(row.join(',')));
    }

    return lines.join('\n');
  }

  /**
   * Generate CSV for metrics summary
   */
  private generateMetricsCSV(metrics: AbsenceMetrics, options: ExportOptions): string {
    const lines: string[] = [];

    lines.push(`"Summary Metrics for ${new Date(options.date).toLocaleDateString('en-IN')}"`);
    lines.push('');
    lines.push('"Metric","Count"');
    lines.push(`"Total Registered Students",${metrics.totalRegisteredStudents}`);
    lines.push(`"Currently Outside",${metrics.currentlyOutside}`);
    lines.push(`"Returned Today",${metrics.returnedToday}`);
    lines.push(`"Overdue Returns",${metrics.overdueReturns}`);
    lines.push(`"Daily Absent at Any Point",${metrics.dailyAbsentAtAnyPoint}`);
    lines.push(`"Approved Leave Not Exited",${metrics.approvedLeaveNotExited}`);

    return lines.join('\n');
  }

  /**
   * Generate CSV for hostel statistics
   */
  private generateHostelStatsCSV(stats: HostelAbsenceStatistics[]): string {
    const lines: string[] = [];

    lines.push(`"Hostel-Wise Absence Statistics"`);
    lines.push('');
    lines.push('"Hostel Name","Total Students","Currently Outside","Returned Today","Overdue","Daily Absent","Absence %"');

    for (const hostel of stats) {
      const row = [
        hostel.hostelName,
        hostel.totalAssignedStudents,
        hostel.currentlyOutside,
        hostel.returnedToday,
        hostel.overdueStudents,
        hostel.dailyAbsentAtAnyPoint,
        `${hostel.absencePercentage}%`,
      ];
      lines.push(this.escapeCSV(row.join(',')));
    }

    return lines.join('\n');
  }

  /**
   * Escape CSV values (handle quotes and commas)
   */
  private escapeCSV(value: string): string {
    if (typeof value !== 'string') {
      return String(value);
    }
    // If value contains comma or quote, wrap in quotes and escape inner quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format tab name for display
   */
  private formatTabName(tab: string): string {
    const names: Record<string, string> = {
      currently_outside: 'Currently Outside',
      overdue: 'Overdue Students',
      returned_today: 'Returned Today',
      daily_absent: 'Daily Absence History',
      approved_not_exited: 'Approved Leave, Not Exited',
    };
    return names[tab] || tab;
  }

  /**
   * Format presence status for display
   */
  private formatPresenceStatus(status: string): string {
    const statuses: Record<string, string> = {
      in_hostel: 'In Hostel',
      out_of_hostel: 'Currently Outside',
      overdue: 'Overdue',
      approved_not_exited: 'Approved, Not Exited',
    };
    return statuses[status] || status;
  }

  /**
   * Download CSV file to user's computer
   */
  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export student records to CSV
   */
  async exportStudentRecords(
    records: StudentAbsenceRecord[],
    options: ExportOptions,
  ): Promise<void> {
    const csv = this.generateStudentCSV(records, options);
    const filename = `${this.formatTabName(options.tabName)}_${options.date}.csv`;
    this.downloadFile(csv, filename);
  }

  /**
   * Export complete report with metrics, hostel stats, and student records
   */
  async exportCompleteReport(
    records: StudentAbsenceRecord[],
    metrics: AbsenceMetrics,
    hostelStats: HostelAbsenceStatistics[],
    options: ExportOptions,
  ): Promise<void> {
    const sections: string[] = [];

    // Add metrics section
    if (options.includeMetrics) {
      sections.push(this.generateMetricsCSV(metrics, options));
      sections.push(''); // Spacer
      sections.push(''); // Spacer
    }

    // Add hostel stats section
    if (options.includeHostelStats) {
      sections.push(this.generateHostelStatsCSV(hostelStats));
      sections.push(''); // Spacer
      sections.push(''); // Spacer
    }

    // Add student records section
    sections.push(this.generateStudentCSV(records, options));

    const csv = sections.join('\n');
    const filename = `hostel-presence-report_${options.date}.csv`;
    this.downloadFile(csv, filename);
  }

  /**
   * Copy table to clipboard (for pasting into Excel)
   */
  async copyToClipboard(records: StudentAbsenceRecord[]): Promise<void> {
    // Create tab-separated format for Excel
    const lines: string[] = [];

    // Headers
    const headers = [
      'Student Name',
      'Roll Number',
      'Hostel',
      'Room',
      'Phone',
      'Exit Date/Time',
      'Expected Return',
      'Return Date/Time',
      'Gate Pass No.',
      'Leave Status',
      'Presence Status',
    ];
    lines.push(headers.join('\t'));

    // Data
    for (const record of records) {
      const row = [
        record.name,
        record.rollNumber,
        record.hostelName || '-',
        record.roomNumber || '-',
        record.phone || '-',
        record.exitTimestamp ? new Date(record.exitTimestamp).toLocaleString('en-IN') : '-',
        record.expectedReturnTimestamp ? new Date(record.expectedReturnTimestamp).toLocaleString('en-IN') : '-',
        record.returnTimestamp ? new Date(record.returnTimestamp).toLocaleString('en-IN') : '-',
        record.gatePassNumber || '-',
        record.leaseStatus || '-',
        this.formatPresenceStatus(record.presenceStatus),
      ];
      lines.push(row.join('\t'));
    }

    const tsv = lines.join('\n');

    try {
      await navigator.clipboard.writeText(tsv);
      return Promise.resolve();
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return Promise.reject(err);
    }
  }
}

export const absenceExportService = new AbsenceExportService();
