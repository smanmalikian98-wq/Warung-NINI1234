import React, { useState, FormEvent, ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';

// !!! PENTING: Ganti dengan URL Web App dari Google Apps Script Anda !!!
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwGtN7eB_n05Iu7jput1-wq6IslUhVLWYq1TC3CNGTIsVV-LNhnT1N5zETw38bquyOg1Q/exec';

// Data structure for a single record
interface SpeedRecord {
    tgl: string;
    a: number; // <5
    b: number; // 5-10
    c: number; // 10-15
    d: number; // 15-20
    e: number; // 20-30
    f: number; // >30
    omset: number;
    speedRata2: string;
    allTransaksi: number;
    transaksiHariIni: number;
    transaksiOver: number;
    persentase: number;
    transaksiOverHari: number;
    hari: string;
    keterangan: string;
    jumlahQc: number;
    validasi: boolean;
}

// Initial sample data
const initialData: SpeedRecord[] = [
    {
        tgl: '2024-07-29',
        a: 60,
        b: 95,
        c: 15,
        d: 1,
        e: 0,
        f: 0,
        omset: 16945250,
        speedRata2: '0:06:17',
        allTransaksi: 171,
        transaksiHariIni: 171,
        transaksiOver: 16,
        persentase: 9.36,
        transaksiOverHari: 16,
        hari: 'Senin',
        keterangan: 'Gorengan goreng baru',
        jumlahQc: 5,
        validasi: true,
    }
];

// Initial state for the form
const initialFormState = {
    tgl: new Date().toISOString().split('T')[0],
    a: '0', b: '0', c: '0', d: '0', e: '0', f: '0',
    omset: '0',
    keterangan: '',
    jumlahQc: '0',
    validasi: false,
};

const App = () => {
    const [records, setRecords] = useState<SpeedRecord[]>(initialData);
    const [formState, setFormState] = useState(initialFormState);
    const [isSending, setIsSending] = useState(false);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormState(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    
    const getDayName = (dateStr: string): string => {
        const date = new Date(dateStr);
        // Add timezone offset to prevent day shifting
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return dayNames[adjustedDate.getDay()];
    }

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        
        setIsSending(true);

        const a = parseInt(formState.a, 10) || 0;
        const b = parseInt(formState.b, 10) || 0;
        const c = parseInt(formState.c, 10) || 0;
        const d = parseInt(formState.d, 10) || 0;
        const e = parseInt(formState.e, 10) || 0;
        const f = parseInt(formState.f, 10) || 0;

        const transaksiHariIni = a + b + c + d + e + f;
        const transaksiOver = c + d + e + f;
        const persentase = transaksiHariIni > 0 ? (transaksiOver / transaksiHariIni) * 100 : 0;

        const calculateAverageSpeed = (): string => {
            if (transaksiHariIni === 0) {
                return '00:00:00';
            }
            // Estimate total time by using the midpoint of each time range (in minutes)
            // A(<5)=2.5, B(5-10)=7.5, C(10-15)=12.5, D(15-20)=17.5, E(20-30)=25, F(>30) assumed 35
            const totalMinutes = (a * 2.5) + (b * 7.5) + (c * 12.5) + (d * 17.5) + (e * 25) + (f * 35);
            const averageMinutes = totalMinutes / transaksiHariIni;
            const totalSeconds = Math.floor(averageMinutes * 60);

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const pad = (num: number) => num.toString().padStart(2, '0');
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        };
        
        const newRecord: SpeedRecord = {
            tgl: formState.tgl,
            a, b, c, d, e, f,
            omset: parseInt(formState.omset, 10) || 0,
            speedRata2: calculateAverageSpeed(),
            allTransaksi: transaksiHariIni,
            transaksiHariIni,
            transaksiOver,
            persentase,
            transaksiOverHari: transaksiOver,
            hari: getDayName(formState.tgl),
            keterangan: formState.keterangan,
            jumlahQc: parseInt(formState.jumlahQc, 10) || 0,
            validasi: formState.validasi,
        };

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newRecord)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.status === "success") {
                alert('Data berhasil dikirim ke Spreadsheet!');
                setRecords(prevRecords => [newRecord, ...prevRecords]);
                setFormState(initialFormState); // Reset form
            } else {
                throw new Error(result.message || 'Gagal mengirim data. Respon tidak dikenal dari server.');
            }

        } catch (error) {
            console.error('Error sending data to spreadsheet:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Gagal mengirim data ke Spreadsheet. Silakan coba lagi.\n\nDetail: ${errorMessage}`);
        } finally {
            setIsSending(false);
        }
    };
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    };

    return (
        <div className="container">
            <h1>Daily Speed Tracker</h1>

            <div className="form-container" role="form" aria-labelledby="form-title">
                <h2 id="form-title">Tambah Data Baru</h2>
                <form onSubmit={handleSubmit} className="form-grid">
                    <div className="form-group">
                        <label htmlFor="tgl">Tanggal</label>
                        <input type="date" id="tgl" name="tgl" value={formState.tgl} onChange={handleInputChange} required disabled={isSending} />
                    </div>
                     <div className="form-group">
                        <label htmlFor="a">A (&lt;5)</label>
                        <input type="number" id="a" name="a" value={formState.a} onChange={handleInputChange} min="0" disabled={isSending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="b">B (5-10)</label>
                        <input type="number" id="b" name="b" value={formState.b} onChange={handleInputChange} min="0" disabled={isSending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="c">C (10-15)</label>
                        <input type="number" id="c" name="c" value={formState.c} onChange={handleInputChange} min="0" disabled={isSending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="d">D (15-20)</label>
                        <input type="number" id="d" name="d" value={formState.d} onChange={handleInputChange} min="0" disabled={isSending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="e">E (20-30)</label>
                        <input type="number" id="e" name="e" value={formState.e} onChange={handleInputChange} min="0" disabled={isSending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="f">F (&gt;30)</label>
                        <input type="number" id="f" name="f" value={formState.f} onChange={handleInputChange} min="0" disabled={isSending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="omset">Omset</label>
                        <input type="number" id="omset" name="omset" value={formState.omset} onChange={handleInputChange} min="0" disabled={isSending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="keterangan">Keterangan</label>
                        <input type="text" id="keterangan" name="keterangan" value={formState.keterangan} onChange={handleInputChange} disabled={isSending} />
                    </div>
                     <div className="form-group">
                        <label htmlFor="jumlahQc">Jumlah/QC</label>
                        <input type="number" id="jumlahQc" name="jumlahQc" value={formState.jumlahQc} onChange={handleInputChange} min="0" disabled={isSending} />
                    </div>
                     <div className="form-group checkbox-group">
                        <input type="checkbox" id="validasi" name="validasi" checked={formState.validasi} onChange={handleInputChange} disabled={isSending} />
                        <label htmlFor="validasi">Validasi</label>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={isSending}>
                            {isSending ? 'Mengirim...' : 'Simpan & Kirim ke Spreadsheet'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Tgl</th>
                            <th>Hari</th>
                            <th>A &lt;5</th>
                            <th>B 5-10</th>
                            <th>C 10-15</th>
                            <th>D 15-20</th>
                            <th>E 20-30</th>
                            <th>F &gt;30</th>
                            <th>Omset</th>
                            <th>Speed Rata2</th>
                            <th>All Transaksi</th>
                            <th>Transaksi Hari Ini</th>
                            <th>Transaksi Over</th>
                            <th>% Tase</th>
                            <th>Trans Over/hari</th>
                            <th>Keterangan</th>
                            <th>JUMLAH/QC</th>
                            <th>Validasi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((rec, index) => (
                            <tr key={index}>
                                <td>{rec.tgl}</td>
                                <td>{rec.hari}</td>
                                <td>{rec.a}</td>
                                <td>{rec.b}</td>
                                <td>{rec.c}</td>
                                <td>{rec.d}</td>
                                <td>{rec.e}</td>
                                <td>{rec.f}</td>
                                <td>{formatCurrency(rec.omset)}</td>
                                <td>{rec.speedRata2}</td>
                                <td>{rec.allTransaksi}</td>
                                <td>{rec.transaksiHariIni}</td>
                                <td>{rec.transaksiOver}</td>
                                <td>{rec.persentase.toFixed(2)}%</td>
                                <td>{rec.transaksiOverHari}</td>
                                <td>{rec.keterangan}</td>
                                <td>{rec.jumlahQc}</td>
                                <td className={rec.validasi ? 'validation-true' : 'validation-false'}>
                                  {rec.validasi ? 'TRUE' : 'FALSE'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!); 
root.render(<App />);