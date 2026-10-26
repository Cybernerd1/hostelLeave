/**
 * Admin: Student Import Page
 * CSV/Excel import with preview, validation, and error reporting.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import './AdminPages.css';
import { parse } from 'papaparse';
import * as XLSX from 'xlsx';

export function ImportStudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminOrChief = user?.role === 'admin' || user?.role === 'chief_warden';

  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [preview, setPreview] = useState<Array<Record<string, unknown> & { valid: boolean; errors: string[] }> | null>(null);
  const [importResult, setImportResult] = useState<{ successful: number; failed: number; duplicates: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setMsg(null);
    setPreview(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let parsed: Record<string, unknown>[] = [];

        if (f.name.endsWith('.csv') || f.type === 'text/csv') {
          const result = parse(content, { header: true, skipEmptyLines: true, trim: true });
          if (result.errors.length > 0) {
            setError('CSV parsing errors: ' + result.errors.map((err: any) => err.message).join(', '));
            return;
          }
          parsed = result.data as Record<string, unknown>[];
        } else {
          const workbook = XLSX.read(content, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsed = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        }

        setRecords(parsed);
      } catch (err: unknown) {
        setError('Failed to parse file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    if (f.name.endsWith('.csv')) {
      reader.readAsText(f);
    } else {
      reader.readAsArrayBuffer(f);
      // For Excel, use array buffer
      reader.onload = (event) => {
        try {
          const ab = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(ab, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          setRecords(parsed);
        } catch (err: unknown) {
          setError('Failed to parse Excel file: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      };
    }
  };

  const handlePreview = useCallback(async () => {
    if (!records.length) return;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.previewImport(records);
      setPreview(result);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to generate preview.');
    } finally {
      setLoading(false);
    }
  }, [records]);

  const handleImport = async () => {
    if (!records.length) return;
    setImporting(true);
    setMsg(null);
    try {
      const result = await adminApi.importStudents(records);
      setImportResult({
        successful: result.successful.length,
        failed: result.failed.length,
        duplicates: result.duplicates.length,
      });
      setMsg(`✅ Import complete: ${result.successful.length} successful, ${result.failed.length} failed, ${result.duplicates.length} duplicates.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMsg('❌ ' + (e.response?.data?.message || 'Import failed.'));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (type: 'csv' | 'excel') => {
    navigate(`/admin/students/import/template/${type}`);
  };

  if (!isAdminOrChief) {
    return (
      <div className="approvals-page animate-fade-in-up">
        <div className="table-empty"><p>Access denied. Admin or Chief Warden role required.</p></div>
      </div>
    );
  }

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <button className="btn-action btn-action--view" onClick={() => navigate('/admin/students')} style={{ marginRight: 8 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="approvals-page__title">Import Students</h1>
          <p className="approvals-page__subtitle">Import students from CSV or Excel files</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {msg && <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 6, background: msg.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✅') ? '#15803d' : '#dc2626', fontSize: '0.875rem' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Upload Card */}
        <Card variant="default" padding="lg">
          <p className="detail-section__title">Upload File</p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Select CSV or Excel file
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading || importing}
            />
            {file && (
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.5rem' }}>
                {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <button className="btn btn--secondary" onClick={() => downloadTemplate('csv')} disabled={loading || importing}>
              Download CSV Template
            </button>
            <button className="btn btn--secondary" onClick={() => downloadTemplate('excel')} disabled={loading || importing}>
              Download Excel Template
            </button>
          </div>

          <button
            className="btn btn--primary"
            onClick={handlePreview}
            disabled={!file || loading || importing}
          >
            {loading ? 'Parsing…' : 'Preview Records'}
          </button>
        </Card>

        {/* Preview Card */}
        {preview && (
          <Card variant="default" padding="lg">
            <p className="detail-section__title">Preview ({preview.length} records)</p>
            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {Object.keys(preview[0] || {}).filter(k => k !== 'valid' && k !== 'errors').map(k => (
                      <th key={k}>{k}</th>
                    ))}
                    <th>Valid</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={row.valid ? '' : 'table-row--invalid'}>
                      {Object.keys(row).filter(k => k !== 'valid' && k !== 'errors').map(k => (
                        <td key={k}>{String(row[k] || '')}</td>
                      ))}
                      <td>
                        <span className={`status-badge status-badge--${row.valid ? 'approved' : 'rejected'}`}>
                          {row.valid ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{row.errors?.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn--primary" onClick={handleImport} disabled={importing || !preview.some(r => r.valid)}>
                {importing ? 'Importing…' : 'Import Valid Records'}
              </button>
            </div>
          </Card>
        )}

        {/* Import Result Card */}
        {importResult && (
          <Card variant="default" padding="lg">
            <p className="detail-section__title">Import Summary</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, padding: '0.75rem', background: '#d1fae5', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>Successful</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>{importResult.successful}</div>
              </div>
              <div style={{ flex: 1, padding: '0.75rem', background: '#fee2e2', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Failed</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{importResult.failed}</div>
              </div>
              <div style={{ flex: 1, padding: '0.75rem', background: '#fef3c7', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Duplicates</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{importResult.duplicates}</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}



