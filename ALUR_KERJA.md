# Cetak Biru Sistem Web TERABACA Kabupaten Tasikmalaya (V2)

## 1. Multi-User Peran (Roles)
*   **Kepala Cabang:** Mengelola penjadwalan, menunjuk Praktisi, dan memantau KPI tim.
*   **Admin Cabang:** Memverifikasi pembayaran sekolah, mengunggah berkas PDF hasil ke pusat, dan mencetak lembar hasil.
*   **Praktisi:** Menerima tugas pengetesan lapangan dan menyajikan presentasi hasil ke sekolah.
*   **Sekolah (Portal Mitra):** Melakukan pemesanan paket, konfirmasi pembayaran, serta melihat riwayat data tes siswa (dukungan untuk *repeat order*).

## 2. Alur Tahapan Kerja (Workflow Status)
1.  **Booking/Order:** Sekolah memesan paket (Sistem otomatis mengunci *Special Price* jika terdeteksi akun sekolah lama/repeat order).
2.  **Payment Verification:** Admin memverifikasi bukti pembayaran sekolah. Sistem mengunci tahap berikutnya jika status belum lunas.
3.  **Scheduling:** Kepala Cabang memplot jadwal dan menunjuk Praktisi Lapangan & Praktisi Saji Hasil.
4.  **Testing & Upload:** Praktisi melaksanakan tes -> Admin mengumpulkan kertas A4, men-scan, lalu mengunggah PDF ke pusat.
5.  **Result Ready:** Pusat mengirim balik berkas analisa -> Admin mencetak (printout) hasil.
6.  **Saji Hasil:** Praktisi Saji Hasil mempresentasikan berkas pada tanggal yang disepakati -> Status Selesai.

## 3. Metrik Kinerja (KPI) Utama
*   **Admin:** SLA kecepatan upload file ke pusat setelah tes selesai (Target: maks 2x24 jam).
*   **Praktisi Saji Hasil:** Persentase ketepatan waktu saji hasil dan persentase retensi (*repeat order*) sekolah dampingan.
"Update warna UI dan fitur cetak invoice"