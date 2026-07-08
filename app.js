const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx'); // Tambahan library Excel

const app = express();
const PORT = process.env.PORT || 3005; 

// Gunakan Memory Storage Multer agar file tidak disimpan di disk lokal Vercel
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('./'));
// JALUR KHUSUS DOWNLOAD TEMPLATE EXCEL
app.get('/template-siswa.xlsx', (req, res) => {
    const lokasiFile = path.join(__dirname, 'template-siswa.xlsx');
    res.download(lokasiFile, 'template-siswa.xlsx', (err) => {
        if (err) {
            console.error("File tidak ditemukan:", err);
            res.status(404).send("Maaf, file template belum tersedia di server.");
        }
    });
});

// ====================================================================
// KONEKSI UTAMA KE SUPABASE CLOUD 
// ====================================================================
const SUPABASE_URL = "https://cawrwgieawcrqhvthqbn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cJmrFCKBOIV7s6w4aUAasQ_grQlSL9F";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KUNCI_RAHASIA_KABAG = "kabagterabaca";
const KUNCI_RAHASIA_ADMIN = "adminterabaca";

// Data Master Paket Statis
const hargaPaketMaster = {
    basic:  { nama: "Paket Basic", personal: 350000, lembaga: 175000 },
    parent: { nama: "Paket Parent", personal: 350000, lembaga: 175000 },
    talent: { nama: "Paket Talent", personal: 600000, lembaga: 450000 }
};

let sessionSandiBenar = false; 

// Middleware Pos Satpam Internal
function pastikanInternal(req, res, next) {
    if (sessionSandiBenar === true) { next(); } 
    else {
        res.send(`
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <div style="font-family:'Segoe UI', sans-serif; text-align:center; padding-top:100px; max-width:500px; margin:0 auto; background-color: #F8F9FA; min-height: 100vh;">
                <h1 style="color:#C73238; font-size:42px; margin-bottom:10px;">🔒 AKSES DITOLAK</h1>
                <p style="color:#4b5563;">Halaman dapur internal TERABACA ini dilindungi sandi khusus rahasia pengurus.</p>
                <a href="/internal/login-page" style="background-color:#7A4B94; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block; margin-top:15px;">Masukan Kata Sandi Rahasia</a>
            </div>
        `);
    }
}

// Helper Fungsi: Upload File Langsung Ke Supabase Storage Bucket
async function uploadKeSupabaseStorage(file, prefix = 'file') {
    if (!file) return 'tidak_ada_file.png';
    const namaFileUnik = `${prefix}-${Date.now()}${path.extname(file.originalname)}`;
    
    try {
        const { data, error } = await supabase.storage
            .from('terabaca-files')
            .upload(namaFileUnik, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("Gagal Upload Storage:", error.message);
            return 'error_upload.png'; // Kembalikan string error daripada crash
        }
        
        const { data: linkPublik } = supabase.storage.from('terabaca-files').getPublicUrl(namaFileUnik);
        return linkPublik.publicUrl;
    } catch (err) {
        console.error("Exception saat upload:", err);
        return 'error_upload.png';
    }
}

// 1. HALAMAN UTAMA / PORTAL UTAMA (Responsif)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Portal Terabaca</title>
            <style>
                .grup-tombol { display: flex; gap: 10px; flex-wrap: wrap; }
                .tombol-daftar { flex: 1 1 100%; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; color: white; box-sizing: border-box; }
                .grup-form-klien { display: flex; gap: 10px; flex-wrap: wrap; }
                .input-klien { flex: 1 1 100%; }
                @media (min-width: 600px) {
                    .tombol-daftar { flex: 1; }
                    .input-klien { flex: 1; }
                }
            </style>
        </head>
        <body style="background-color: #F8F9FA; margin: 0; padding: 15px;">
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); background-color: white;">
                <h2 style="color: #7A4B94; text-align: center; margin-top: 0; margin-bottom: 5px;">Portal Utama TERABACA V2</h2>
                <p style="color: #6b7280; text-align: center; margin-top: 0; font-size: 14px;">Kabupaten Tasikmalaya (Cloud Connected)</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                
                <div style="margin-bottom: 20px; padding: 15px; border: 1px dashed #7A4B94; border-radius: 6px; background-color: #faf5ff;">
                    <h4 style="margin: 0 0 15px 0; color: #7A4B94; text-align: center;">📋 JALUR PENDAFTARAN KLIEN BARU</h4>
                    <div class="grup-tombol">
                        <a href="/portal/sekolah-baru" class="tombol-daftar" style="background-color: #C73238;">Sekolah Baru</a>
                        <a href="/portal/sekolah-lama" class="tombol-daftar" style="background-color: #1A5B9C;">Repeat Order Sekolah</a>
                        <a href="/portal/personal" class="tombol-daftar" style="background-color: #7A4B94;">Klien Personal</a>
                    </div>
                </div>

                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #1A5B9C; border-radius: 6px; background-color: #f0f7ff;">
                    <h4 style="margin: 0 0 10px 0; color: #1A5B9C;">📥 PORTAL MANDIRI KLIEN</h4>
                    <p style="margin: 0 0 15px 0; font-size: 13px; color: #4b5563;">Masukkan ID Order Anda di bawah ini untuk melihat Invoice atau mengunggah berkas siswa:</p>
                    <form action="/portal/cek-akses-klien" method="POST" class="grup-form-klien">
                        <input type="text" name="id_order_input" placeholder="Contoh: TRBC-1234" required class="input-klien" style="padding:12px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box; font-size: 14px;">
                        <button type="submit" class="input-klien" style="background-color:#1A5B9C; color:white; border:none; padding:12px 15px; border-radius:6px; font-weight:bold; cursor:pointer; font-size: 14px;">Buka Portal Klien</button>
                    </form>
                </div>

                <div style="padding: 15px; border: 1px solid #7A4B94; border-radius: 6px; background-color: #fdfcff; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #7A4B94; text-align: left;">⚙ RUANG INTERNAL (KABAG & ADMIN)</h4>
                    <a href="/internal/login-page" style="display: block; background-color: #7A4B94; color: white; padding: 15px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
                        🔒 Masuk ke Dashboard Manajemen Kinerja
                    </a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// ROUTE POST: SINKRONISASI DATABASE BARU
app.post('/proses-pendaftaran', upload.single('bukti_bayar'), async (req, res) => {
    const { jenis_pendaftar, kategori, nama_klien, kode_paket, jumlah_testee, kontak, tgl_pelaksanaan, tgl_saji, 
            ttl, anak_ke, dari_bersaudara, nama_lembaga, nama_cabang, level, jurusan } = req.body;
    
    const infoPaketTerpilih = hargaPaketMaster[kode_paket];
    const hargaSatuan = (jenis_pendaftar === 'personal') ? infoPaketTerpilih.personal : infoPaketTerpilih.lembaga;
    const totalTagihan = hargaSatuan * parseInt(jumlah_testee || 1);
    
    const linkBuktiBayarCloud = await uploadKeSupabaseStorage(req.file, 'bukti');

    let listNamaAnak = [];
    for(let i = 1; i <= parseInt(jumlah_testee || 1); i++) {
        listNamaAnak.push({ idSiswa: i, namaSiswa: `Siswa Slot ke-${i}`, gender: '-', keterangan: '-', fileScanLokal: 'Belum Ada', statusFormPusat: '❌ Belum Dikirim' });
    }

    const idOrderBaru = 'TRBC-' + Math.floor(Math.random() * 9000 + 1000);

    const { error } = await supabase.from('orders').insert([{
        id_order: idOrderBaru, kategori: kategori, nama_klien: nama_klien, nama_paket: infoPaketTerpilih.nama,
        jumlah_testee: parseInt(jumlah_testee || 1), kontak: kontak, harga_satuan: hargaSatuan, total_tagihan: totalTagihan,
        tgl_pelaksanaan: tgl_pelaksanaan, tgl_saji: tgl_saji || 'Menyesuaikan', bukti_bayar_file: linkBuktiBayarCloud,
        data_siswa: listNamaAnak, ttl: ttl || '-', anak_ke: parseInt(anak_ke || 0), jumlah_bersaudara: parseInt(dari_bersaudara || 0),
        nama_lembaga: nama_lembaga || '-', nama_cabang: nama_cabang || '-', level_kelas: level || '-', jurusan: jurusan || '-'
    }]);

    if(error) return res.status(500).send("Database Supabase Gagal Menyimpan: " + error.message);

    res.send(`<meta name="viewport" content="width=device-width, initial-scale=1.0"><div style="font-family:'Segoe UI', sans-serif; text-align:center; padding:50px;"><h2 style="color:#7A4B94;">Sukses!</h2><p>Pendaftaran berhasil disimpan. ID Order: <b>${idOrderBaru}</b></p><a href="/" style="color:#1A5B9C; font-weight:bold;">Kembali ke Beranda</a></div>`);
});

app.post('/portal/cek-akses-klien', async (req, res) => {
    const { id_order_input } = req.body;
    const { data: order, error } = await supabase.from('orders').select('*').eq('id_order', id_order_input.trim().toUpperCase()).single();
    if (order) { res.redirect(`/portal/workspace-klien/${order.id_order}`); } 
    else { res.send(`<script>alert("ID Order tidak valid atau tidak terdaftar!"); window.location.href = "/";</script>`); }
});

// UPLOAD EXCEL (.XLSX) MASSAL
// RUTE TAMBAH SISWA MANUAL
app.post('/portal/tambah-siswa-manual/:idOrder', async (req, res) => {
    const { idOrder } = req.params;
    const { namaSiswa, gender, keterangan } = req.body;

    // 1. Ambil data order saat ini
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();

    // 2. Siapkan data baru
    let listSiswa = order.data_siswa || [];
    listSiswa.push({
        id: Date.now(), // ID unik berdasarkan waktu
        namaSiswa: namaSiswa,
        gender: gender,
        keterangan: keterangan,
        fileScanLokal: null // Kosongkan dulu
    });

    // 3. Simpan kembali ke Supabase
    await supabase.from('orders').update({ data_siswa: listSiswa }).eq('id_order', idOrder);

    res.redirect(`/portal/workspace-klien/${idOrder}`);
});
// UPLOAD EXCEL (.XLSX) MASSAL (VERSI TEMPLATE RESMI)
app.post('/portal/upload-excel-massal/:idOrder', upload.single('file_excel'), async (req, res) => {
    const idOrder = req.params.idOrder;
    const { asal_halaman } = req.body;
    
    if (!req.file) return res.send(`<script>alert("File Excel tidak ditemukan!"); window.history.back();</script>`);

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const dataExcel = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log("ISI DATA EXCEL YANG DIBACA:");
console.log(dataExcel);

        const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
        
        if (order && dataExcel.length > 0) {
            let listSiswaUpdate = order.data_siswa;
            
            // 1. Mencari otomatis di baris ke berapa judul "Nama" berada
            let startIndex = 0;
            for (let j = 0; j < dataExcel.length; j++) {
                const baris = dataExcel[j].map(cell => String(cell).toLowerCase());
                if (baris.includes('nama') && baris.includes('jenis kelamin')) {
                    startIndex = j + 1; // Mulai ambil data tepat 1 baris di bawah judul
                    break;
                }
            }

            // 2. Menarik data sesuai letak kolom di template asli
            let excelRowIndex = startIndex;
            for (let i = 0; i < listSiswaUpdate.length; i++) {
                
                // Lewati baris kosong jika penginput tidak sengaja melompati baris di Excel
                while(dataExcel[excelRowIndex] && (!dataExcel[excelRowIndex][1] || String(dataExcel[excelRowIndex][1]).trim() === '')) {
                    excelRowIndex++;
                    if(excelRowIndex >= dataExcel.length) break;
                }

                if (dataExcel[excelRowIndex]) {
                    const barisData = dataExcel[excelRowIndex];
                    
                    // Indeks 1 = Kolom Nama | Indeks 3 = Kolom Jenis Kelamin | Indeks 10 = Kolom Level
                    listSiswaUpdate[i].namaSiswa  = barisData[1] ? String(barisData[1]).trim() : listSiswaUpdate[i].namaSiswa;
                    listSiswaUpdate[i].gender     = barisData[3] ? String(barisData[3]).trim() : '-';
                    listSiswaUpdate[i].keterangan = barisData[10] ? String(barisData[10]).trim() : '-';
                }
                excelRowIndex++;
            }
            await supabase.from('orders').update({ data_siswa: listSiswaUpdate }).eq('id_order', idOrder);
        }
        
        if(asal_halaman === 'internal') { res.redirect(`/internal/lihat-siswa/${idOrder}`); } 
        else { res.redirect(`/portal/workspace-klien/${idOrder}`); }
        
    } catch (error) {
        console.error("Gagal membaca Excel:", error);
        res.send(`<script>alert("Gagal membaca file Excel. Pastikan formatnya .xlsx atau .xls!"); window.history.back();</script>`);
    }
});

app.post('/portal/upload-mandiri-siswa/:idOrder/:idSiswa', upload.single('dokumen_testee'), async (req, res) => {
    try {
        const { idOrder, idSiswa } = req.params;
        
        // Cek apakah file ada
        if (!req.file) {
            return res.status(400).send("Error: Tidak ada file yang diunggah.");
        }

        // Cek koneksi Supabase
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id_order', idOrder)
            .single();

        if (fetchError) throw new Error("Database Fetch Error: " + fetchError.message);
        if (!order) throw new Error("Order tidak ditemukan di database");

        // Proses Upload
        const linkBerkasCloud = await uploadKeSupabaseStorage(req.file, `testee-${idOrder}`);
        
        // Update data
        let listSiswaUpdate = order.data_siswa || [];
        const siswa = listSiswaUpdate.find(s => String(s.idSiswa) === String(idSiswa));
        
        if (!siswa) throw new Error("Siswa dengan ID tersebut tidak ditemukan dalam order");
        
        siswa.fileScanLokal = linkBerkasCloud;

        const { error: updateError } = await supabase
            .from('orders')
            .update({ data_siswa: listSiswaUpdate })
            .eq('id_order', idOrder);

        if (updateError) throw new Error("Database Update Error: " + updateError.message);

        res.redirect(`/portal/workspace-klien/${idOrder}`);

    } catch (err) {
        // INI AKAN MENAMPILKAN ERROR ASLINYA DI LAYAR ANDA
        res.status(500).send("<h1>Server Error Debug:</h1><p>" + err.message + "</p>");
    }
});

// WORKSPACE KLIEN
app.get('/portal/workspace-klien/:id', async (req, res) => {
    try {
        const idOrder = req.params.id;
        const { data: order, error } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
        
        if (error) throw new Error(error.message);
        if (!order) return res.send("Data tidak ditemukan.");

        const daftarSiswa = order.data_siswa || [];
        let daftarAnakFormHtml = daftarSiswa.map((siswa) => {
            const isUploaded = (siswa?.fileScanLokal || '').startsWith('http');
            return `
            <div style="padding:15px; border:1px solid #ddd; margin-bottom:10px;">
                <p>👤 <b>${siswa?.namaSiswa || 'Tanpa Nama'}</b></p>
                <small>Status: ${isUploaded ? '✅ Sudah Ada Berkas' : '❌ Belum ada'}</small>
                <form action="/portal/upload-mandiri-siswa/${order.id_order}/${siswa.idSiswa}" method="POST" enctype="multipart/form-data">
                    <input type="file" name="dokumen_testee" required>
                    <button type="submit">Upload</button>
                </form>
            </div>`;
        }).join('');

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Portal Klien</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    .siswa-card { padding: 15px; border: 1px solid #ddd; margin-bottom: 15px; border-radius: 8px; }
                </style>
            </head>
            <body>
                <h2>Portal Klien: ${order.id_order}</h2>
                <p>Nama Klien: <b>${order.nama_klien || 'Iman'}</b></p>
                <hr>
                <h3>Daftar Siswa:</h3>
                ${daftarAnakFormHtml}
                <br>
                <a href="/">Kembali ke Beranda</a>
            </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send("Terjadi error: " + err.message);
    }
});

// INVOICE NOTA RESMI + PRINT PDF
app.get('/portal/invoice/:id', async (req, res) => {
    const idOrder = req.params.id;
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    const { data: settingBank } = await supabase.from('settings').select('value').eq('key', 'info_rekening').single();
    if (!order) return res.send("Invoice tidak ditemukan.");
    const infoBank = settingBank.value;

    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice - ${order.id_order}</title>
            <style>
                @media print {
                    .area-tombol-print { display: none !important; }
                    body { background-color: #ffffff !important; padding: 0 !important; margin: 0 !important; }
                    .kotak-invoice { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
                }
            </style>
        </head>
        <body style="background-color: #F8F9FA; padding: 20px; margin: 0;">
            <div class="area-tombol-print" style="max-width: 650px; margin: 0 auto 15px auto; text-align: right;">
                <button onclick="window.print()" style="background-color: #1A5B9C; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🖨️ Cetak / Simpan PDF</button>
                <button onclick="window.close()" style="background-color: #e5e7eb; color: #4b5563; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; margin-left: 10px;">Tutup Halaman</button>
            </div>
            <div class="kotak-invoice" style="font-family:'Segoe UI',sans-serif;max-width:650px;margin:0 auto;padding:40px;border:1px solid #cbd5e1;border-radius:4px;background:#fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="display:flex;justify-content:space-between;border-bottom:3px solid #7A4B94;padding-bottom:15px;">
                    <div><h2 style="color:#7A4B94;margin:0 0 5px 0;">TERABACA Kab. Tasikmalaya</h2><p style="margin:0;font-size:12px;font-style:italic;">"Nalungtik Titik Manggih Diri"</p></div>
                    <div style="text-align:right;"><h3 style="margin:0 0 5px 0; color:#4b5563;">INVOICE</h3><p style="margin:0; font-size:12px; color:#6b7280;">ID Order: <b>${order.id_order}</b></p></div>
                </div>
                <div style="margin-top: 20px; font-size: 13px;">
                    <p style="margin:0 0 5px 0; color:#6b7280;">Ditagihkan Kepada:</p>
                    <p style="margin:0; font-weight:bold; font-size:15px; color:#1e293b;">${order.nama_klien}</p>
                    <p style="margin:0; color:#4b5563;">Kontak WhatsApp: ${order.kontak}</p>
                </div>
                <table style="width:100%;margin-top:25px;font-size:13px; border-collapse: collapse;">
                    <thead>
                        <tr style="background:#faf5ff;text-align:left; color:#7A4B94; border-bottom: 2px solid #e9d5ff;">
                            <th style="padding:10px;">Paket</th><th style="padding:10px;text-align:center;">Kuota</th><th style="padding:10px;text-align:right;">Satuan</th><th style="padding:10px;text-align:right;">Total Tagihan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding:12px 10px; border-bottom:1px solid #e5e7eb;"><b>Asesmen (${order.nama_paket})</b></td>
                            <td style="padding:12px 10px;text-align:center; border-bottom:1px solid #e5e7eb;">${order.jumlah_testee}</td>
                            <td style="padding:12px 10px;text-align:right; border-bottom:1px solid #e5e7eb;">Rp ${order.harga_satuan.toLocaleString('id-ID')}</td>
                            <td style="padding:12px 10px;text-align:right;font-weight:bold; border-bottom:1px solid #e5e7eb;">Rp ${order.total_tagihan.toLocaleString('id-ID')}</td>
                        </tr>
                    </tbody>
                </table>
                <div style="margin-top:30px; background-color:#f0f7ff; padding: 15px; border-left: 4px solid #1A5B9C; border-radius: 4px;">
                    <p style="margin:0; font-weight:bold; color:#1A5B9C; font-size:13px; margin-bottom:5px;">Informasi Pembayaran (Transfer Bank):</p>
                    <p style="margin:0; font-size:14px; color:#334155;">Bank <b>${infoBank.bank}</b></p>
                    <p style="margin:0; font-size:16px; font-weight:bold; letter-spacing:1px; color:#0f172a;">${infoBank.nomorRekening}</p>
                    <p style="margin:0; font-size:13px; color:#475569;">a.n. ${infoBank.atasNama}</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// MENU FORM REGISTRASI (Sekolah)
app.get('/portal/sekolah-:tipe', (req, res) => {
    const tipeSekolah = req.params.tipe;
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Form Lembaga - Terabaca</title>
    </head>
    <body style="background-color: #F8F9FA; padding: 15px; margin: 0;">
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:10px auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px; background-color: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <h3 style="color: #7A4B94; margin-top:0;">Form Lembaga (${tipeSekolah.toUpperCase()})</h3>
            <form action="/proses-pendaftaran" method="POST" enctype="multipart/form-data">
                <input type="hidden" name="jenis_pendaftar" value="lembaga">
                <input type="hidden" name="kategori" value="Lembaga (${tipeSekolah})">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Nama Lembaga/Sekolah:</label><input type="text" name="nama_lembaga" required style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Nama Cabang:</label><input type="text" name="nama_cabang" required style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Pilih Paket:</label>
                <select name="kode_paket" style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;"><option value="basic">Basic</option><option value="parent">Parent</option><option value="talent">Talent</option></select>
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Jumlah Testee:</label><input type="number" name="jumlah_testee" required style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Level/Kelas:</label><input type="text" name="level" placeholder="Misal: Kelas 5" style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Jurusan (Khusus Talent):</label><input type="text" name="jurusan" placeholder="Misal: IPA" style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">WhatsApp:</label><input type="text" name="kontak" required style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Tanggal Pelaksanaan Tes:</label><input type="date" name="tgl_pelaksanaan" required style="width:100%;padding:12px;margin-bottom:20px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold; display:block;">Bukti DP Pembayaran:</label><input type="file" name="bukti_bayar" required style="margin-bottom: 20px; width:100%;"><br>
                <button type="submit" style="width:100%;padding:14px;background:#7A4B94;color:#fff;border:none; border-radius:6px; font-weight:bold; font-size:15px; cursor:pointer;">Kirim Pendaftaran</button>
            </form>
        </div>
    </body>
    </html>`);
});

// LOGIN INTERNAL
app.get('/internal/login-page', (req, res) => {
    const errorMsg = req.query.error ? `<p style="color:#C73238; font-size:13px; font-weight:bold;">❌ Kata sandi salah!</p>` : '';
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Internal - Terabaca</title>
    </head>
    <body style="background-color: #F8F9FA; padding: 15px; margin: 0;">
        <div style="font-family:'Segoe UI',sans-serif;max-width:400px;margin:40px auto;padding:30px;border:1px solid #e5e7eb;border-radius:8px;text-align:center; background:white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <h3 style="color:#7A4B94; margin-top:0;">Verifikasi Internal Terabaca</h3>
            ${errorMsg}
            <form action="/internal/proses-verifikasi" method="POST" style="text-align:left;">
                <label style="display:block;font-size:14px;font-weight:bold;margin-bottom:8px; color:#4b5563;">Masukkan Kata Sandi Rahasia:</label>
                <input type="password" name="sandi_input" required style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #ccc;border-radius:6px; box-sizing:border-box; font-size:14px;">
                <button type="submit" style="width:100%;background-color:#7A4B94;color:white;padding:12px;border:none;border-radius:6px;font-weight:bold; cursor:pointer; font-size:15px;">Buka Ruang Internal 🔓</button>
            </form>
        </div>
    </body>
    </html>`);
});
app.post('/internal/proses-verifikasi', (req, res) => {
    if (req.body.sandi_input === KUNCI_RAHASIA_KABAG || req.body.sandi_input === KUNCI_RAHASIA_ADMIN) { sessionSandiBenar = true; res.redirect('/internal/dashboard'); } 
    else { sessionSandiBenar = false; res.redirect('/internal/login-page?error=true'); }
});
app.get('/internal/logout', (req, res) => { sessionSandiBenar = false; res.redirect('/'); });

// DASHBOARD UTAMA MANAJEMEN INTERNAL
app.get('/internal/dashboard', pastikanInternal, async (req, res) => {
    const { data: listOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: settingPraktisi } = await supabase.from('settings').select('value').eq('key', 'daftar_praktisi').single();
    const daftarPraktisi = (settingPraktisi && settingPraktisi.value) ? settingPraktisi.value : [];
    let barisTabel = '';
    
    (listOrders || []).forEach((order) => {
        let opsiPraktisiLap = `<option value="">-- Pilih Praktisi Lap --</option>`; 
        let opsiPraktisiSaji = `<option value="">-- Pilih Praktisi Saji --</option>`;
        daftarPraktisi.forEach(p => { 
            opsiPraktisiLap += `<option value="${p}" ${order.praktisi_lapangan === p ? 'selected' : ''}>${p}</option>`; 
            opsiPraktisiSaji += `<option value="${p}" ${order.praktisi_saji === p ? 'selected' : ''}>${p}</option>`; 
        });
        const berkasSiap = (order.data_siswa && Array.isArray(order.data_siswa)) ? order.data_siswa.filter(s => s.fileScanLokal && s.fileScanLokal.startsWith('http')).length : 0;
        
        barisTabel += `<tr style="border-bottom:1px solid #e5e7eb;font-size:13px; background-color:white;">
            <td style="padding:12px;"><b>${order.id_order}</b></td>
            <td style="padding:12px;"><b>${order.nama_klien || 'Nama Klien Belum Diisi'}</b><br><small style="color:#7A4B94; font-weight:bold;">${order.nama_paket}</small><br><a href="/internal/lihat-siswa/${order.id_order}" style="color:#1A5B9C;font-weight:bold;font-size:11px;">🔎 Kelola Berkas Anak (${berkasSiap}/${order.jumlah_testee || 0} Siap)</a></td>
            <td style="padding:12px;text-align:center;">${order.jumlah_testee || 0}</td>
            <td style="padding:12px;">Rp ${(order.total_tagihan || 0).toLocaleString('id-ID')}<br>${order.status_pembayaran==='Lunas'?`<span style="color:#10b981;font-weight:bold;">✔ Lunas</span>`:`<a href="/internal/lunaskan/${order.id_order}" style="color:#C73238; font-weight:bold;">Set Lunas</a>`}</td>
            <td style="padding:12px;"><form action="/internal/plot-tim/${order.id_order}" method="POST" style="display:flex;flex-direction:column;gap:3px;"><select name="praktisi_lapangan" style="font-size:10px;">${opsiPraktisiLap}</select><select name="praktisi_saji" style="font-size:10px;">${opsiPraktisiSaji}</select><button type="submit" style="font-size:10px; background-color:#1A5B9C; color:white; border:none; padding:4px; border-radius:3px;">Simpan Tim</button></form></td>
            <td style="padding:12px;font-size:11px;"><b>Lap:</b> ${order.praktisi_lapangan || '-'}<br><b>Saji:</b> ${order.praktisi_saji || '-'}</td>
            <td style="padding:12px;text-align:center;"><div>${order.status_upload_pusat || '-'}</div><a href="/internal/upload-pusat/${order.id_order}" style="font-size:10px; color:#7A4B94; font-weight:bold;">📤 Struk Pusat</a></td>
        </tr>`;
    });

    res.send(`<body style="background-color: #F8F9FA; margin:0;"><div style="font-family:'Segoe UI',sans-serif;padding:25px; max-width: 1200px; margin: 0 auto;"><div style="display:flex;justify-content:space-between;align-items:center;"><h2><span style="color:#7A4B94;">📊 Dashboard Cloud</span> Kantor Cabang Tasikmalaya</h2><div style="display:flex; gap:10px;"><a href="/internal/pengaturan" style="background-color:#1A5B9C;color:white;padding:8px 15px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">⚙ Pengaturan Sistem</a><a href="/internal/logout" style="background-color:#C73238;color:white;padding:8px 15px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">🔒 Logout</a></div></div><div style="overflow-x:auto;"><table style="width:100%; min-width:800px; border-collapse:collapse;margin-top:20px;border:1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><thead><tr style="background-color:#7A4B94;color:white;text-align:left;font-size:13px;"><th style="padding:12px;">ID</th><th style="padding:12px;">Nama Klien</th><th style="padding:12px;text-align:center;">Testee</th><th style="padding:12px;">Keuangan</th><th style="padding:12px;">Plotting Tim</th><th style="padding:12px;">Status Tim</th><th style="padding:12px;text-align:center;">Setoran Pusat</th></tr></thead><tbody>${barisTabel || '<tr><td colspan="7" style="text-align:center;padding:30px;color:#9ca3af; background-color:white;">Belum ada data pendaftaran di Supabase cloud.</td></tr>'}</tbody></table></div></div></body>`);
});

app.get('/internal/lihat-siswa/:id', pastikanInternal, async (req, res) => {
    const idOrder = req.params.id;
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    
    if (!order) return res.send("Data tidak ditemukan.");

    let daftarAnakHtml = '';
    
    // Perulangan untuk membuat daftar siswa
    (order.data_siswa || []).forEach((siswa) => {
        const fileScan = siswa.fileScanLokal || '';
        const isUploaded = fileScan.startsWith('http');
        
        daftarAnakHtml += `
            <div style="padding:10px; border:1px solid #ccc; margin-bottom:5px; border-radius:4px;">
                <p style="margin:0; font-weight:bold;">👤 Nama: ${siswa.namaSiswa}</p>
                <p style="margin:5px 0 0 0; font-size:13px;">Status: ${isUploaded ? '✅ Sudah Upload' : '❌ Belum Ada Berkas'}</p>
            </div>
        `;
    });

    // Kirim respons HTML lengkap hanya satu kali
    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <body style="background-color: #F8F9FA; padding: 20px; margin: 0;">
            <div style="font-family:'Segoe UI',sans-serif; max-width:750px; margin:20px auto; padding:30px; border:1px solid #e5e7eb; border-radius:8px; background-color: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <a href="/internal/dashboard" style="text-decoration:none; color:#1A5B9C; font-size:14px; font-weight:bold;">← Kembali ke Dashboard</a>
                <h3 style="color:#7A4B94;">Daftar Dokumen Masuk Cloud</h3>
                <p>Lembaga Mitra: <b>${order.nama_klien}</b> [${order.id_order}]</p>
                <hr style="border:0; border-top:1px solid #e5e7eb; margin:15px 0;">
                
                <div style="background-color: #faf5ff; padding: 15px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #e9d5ff;">
                    <b style="color: #7A4B94; font-size: 14px; display:block; margin-bottom:10px;">📋 Upload Excel Massal (Tim Internal)</b>
                    <form action="/portal/upload-excel-massal/${order.id_order}" method="POST" enctype="multipart/form-data" style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
                        <input type="hidden" name="asal_halaman" value="internal">
                        <input type="file" name="file_excel" accept=".xlsx, .xls" required style="flex:1 1 200px; font-size:13px; border:1px solid #cbd5e1; padding:8px; border-radius:4px; background:#fff;">
                        <button type="submit" style="background-color:#7A4B94; color:white; border:none; padding:10px 15px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:13px; flex:1 1 150px;">Simpan Data Excel</button>
                    </form>
                </div>

                <div style="display:flex; flex-direction:column; gap:8px;">${daftarAnakHtml}</div>
            </div>
        </body>
        </html>
    `);
});

// ROUTE INTERNAL PENDUKUNG
app.get('/internal/tandai-terkirim/:idOrder/:idSiswa', async (req, res) => {
    const { idOrder, idSiswa } = req.params;
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    if(order) {
        let listSiswaUpdate = order.data_siswa;
        const siswa = listSiswaUpdate.find(s => s.idSiswa == idSiswa);
        if(siswa) siswa.statusFormPusat = '🔹 TERKIRIM KE PUSAT (GFORM)';
        await supabase.from('orders').update({ data_siswa: listSiswaUpdate }).eq('id_order', idOrder);
    }
    res.redirect(`/internal/lihat-siswa/${idOrder}`);
});
app.get('/internal/lunaskan/:id', async (req, res) => {
    await supabase.from('orders').update({ status_pembayaran: 'Lunas' }).eq('id_order', req.params.id);
    res.redirect('/internal/dashboard');
});
app.post('/internal/plot-tim/:id', async (req, res) => {
    await supabase.from('orders').update({ praktisi_lapangan: req.body.praktisi_lapangan, praktisi_saji: req.body.praktisi_saji }).eq('id_order', req.params.id);
    res.redirect('/internal/dashboard');
});

// ROUTE PENGATURAN
app.get('/internal/pengaturan', pastikanInternal, async (req, res) => {
    const { data: resBank } = await supabase.from('settings').select('value').eq('key', 'info_rekening').single();
    const { data: resPraktisi } = await supabase.from('settings').select('value').eq('key', 'daftar_praktisi').single();
    const infoBank = resBank.value;
    const daftarPraktisi = resPraktisi.value;
    res.send(`
        <body style="background-color: #F8F9FA; padding: 20px; margin: 0;">
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 20px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; background:white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <a href="/internal/dashboard" style="text-decoration: none; color: #1A5B9C; font-size: 14px; font-weight:bold;">← Kembali ke Dashboard</a>
                <h3 style="color:#7A4B94;">⚙ Panel Pengaturan Kantor Cabang (Cloud)</h3>
                <hr style="border:0; border-top:1px solid #e5e7eb; margin:15px 0;">
                <form action="/internal/simpan-pengaturan" method="POST">
                    <label style="font-size:14px; color:#4b5563; font-weight:bold;">Nama Bank:</label><input type="text" name="bank" value="${infoBank.bank}" required style="width:100%; padding:10px; margin-bottom:15px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    <label style="font-size:14px; color:#4b5563; font-weight:bold;">Nomor Rekening:</label><input type="text" name="nomor_rekening" value="${infoBank.nomorRekening}" required style="width:100%; padding:10px; margin-bottom:15px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    <label style="font-size:14px; color:#4b5563; font-weight:bold;">Nama Pemilik Rekening:</label><input type="text" name="atas_nama" value="${infoBank.atasNama}" required style="width:100%; padding:10px; margin-bottom:25px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    <label style="font-size:14px; color:#4b5563; font-weight:bold;">Tambah Anggota Praktisi Lapangan Baru:</label><input type="text" name="praktisi_baru" placeholder="Ketik nama praktisi..." style="width:100%; padding:10px; margin-bottom:5px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    <small style="color:#6b7280; display:block; margin-bottom:20px;">Aktif: <i>${daftarPraktisi.join(', ')}</i></small>
                    <button type="submit" style="width:100%; padding:12px; background:#1A5B9C; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">💾 Simpan ke Supabase Cloud</button>
                </form>
            </div>
        </body>
    `);
});
app.post('/internal/simpan-pengaturan', pastikanInternal, async (req, res) => {
    const { bank, nomor_rekening, atas_nama, praktisi_baru } = req.body;
    await supabase.from('settings').update({ value: { bank, nomorRekening: nomor_rekening, atasNama: atas_nama } }).eq('key', 'info_rekening');
    if (praktisi_baru && praktisi_baru.trim() !== "") {
        const { data: resPraktisi } = await supabase.from('settings').select('value').eq('key', 'daftar_praktisi').single();
        let listPraktisi = resPraktisi.value;
        listPraktisi.push(praktisi_baru.trim());
        await supabase.from('settings').update({ value: listPraktisi }).eq('key', 'daftar_praktisi');
    }
    res.send(`<script>alert("Pengaturan Cloud Berhasil Di-update!"); window.location.href = "/internal/dashboard";</script>`);
});

// ROUTE AKHIR SETORAN STRUK PUSAT
app.get('/internal/upload-pusat/:id', pastikanInternal, (req, res) => { res.send(`<div style="font-family:'Segoe UI', sans-serif; padding:20px;"><h3 style="color:#7A4B94;">Upload Berkas Setoran Pusat</h3><form action="/internal/proses-upload-pusat/${req.params.id}" method="POST" enctype="multipart/form-data"><input type="file" name="file_setoran" required style="margin-bottom:15px;"><br><button type="submit" style="background-color:#1A5B9C; color:white; padding:8px 15px; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Upload Struk</button></form></div>`); });
app.post('/internal/proses-upload-pusat/:id', pastikanInternal, upload.single('file_setoran'), async (req, res) => {
    if(req.file) {
        const linkStrukCloud = await uploadKeSupabaseStorage(req.file, 'setoran-pusat');
        await supabase.from('orders').update({ file_setoran_pusat_pdf: linkStrukCloud, status_upload_pusat: 'Terupload' }).eq('id_order', req.params.id);
    }
    res.redirect('/internal/dashboard');
});

// FORM PERSONAL
app.get('/portal/personal', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Form Personal - Terabaca</title>
        <style>
            .grup-input { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
            .input-setengah { flex: 1 1 100%; }
            @media (min-width: 600px) { .input-setengah { flex: 1; } }
        </style>
    </head>
    <body style="background-color: #F8F9FA; padding: 15px; margin: 0;">
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:10px auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px; background-color: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <h3 style="color:#7A4B94; margin-top:0;">Form Pendaftaran Personal</h3>
            <form action="/proses-pendaftaran" method="POST" enctype="multipart/form-data">
                <input type="hidden" name="jenis_pendaftar" value="personal">
                <input type="hidden" name="kategori" value="Personal">
                <input type="hidden" name="jumlah_testee" value="1">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Nama Lengkap:</label><input type="text" name="nama_klien" required style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Tempat, Tanggal Lahir (TTL):</label><input type="text" name="ttl" placeholder="Contoh: Tasikmalaya, 12 Januari 2010" required style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <div class="grup-input">
                    <div class="input-setengah"><label style="font-size:14px; color:#4b5563; font-weight:bold;">Anak ke-:</label><input type="number" name="anak_ke" required style="width:100%;padding:12px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; margin-top:5px;"></div>
                    <div class="input-setengah"><label style="font-size:14px; color:#4b5563; font-weight:bold;">Dari (X) Bersaudara:</label><input type="number" name="jumlah_bersaudara" required style="width:100%;padding:12px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; margin-top:5px;"></div>
                </div>
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Nama Cabang:</label><input type="text" name="nama_cabang" required style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Pilih Paket:</label><select name="kode_paket" style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;"><option value="basic">Basic</option><option value="parent">Parent</option><option value="talent">Talent</option></select>
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Level/Kelas (Opsional):</label><input type="text" name="level_kelas" placeholder="Misal: Kelas 4 SD" style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Jurusan (Jika Paket Talent):</label><input type="text" name="jurusan" placeholder="Misal: IPA/IPS/Teknik" style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">WhatsApp:</label><input type="text" name="kontak" required style="width:100%;padding:12px;margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold;">Tanggal Pelaksanaan Tes:</label><input type="date" name="tgl_pelaksanaan" required style="width:100%;padding:12px;margin-bottom:20px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-size:14px; color:#4b5563; font-weight:bold; display:block;">Bukti Pembayaran:</label><input type="file" name="bukti_bayar" required style="margin-bottom: 20px; width:100%;"><br>
                <button type="submit" style="width:100%;padding:14px;background:#7A4B94;color:#fff;border:none; border-radius:6px; font-weight:bold; font-size:15px; cursor:pointer;">Kirim Pendaftaran</button>
            </form>
        </div>
    </body>
    </html>`);
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Terabaca Cloud Terkoneksi di http://localhost:${PORT}`);
    console.log(`==================================================`);
});

// BARIS WAJIB UNTUK VERCEL 👇
module.exports = app;