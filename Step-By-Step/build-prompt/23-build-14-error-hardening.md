# Prompt Build #14 (BISA MENYUSUL): Error Handling & Edge Case — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Perkuat penanganan error di seluruh alur v1 supaya pengalaman pengguna tetap jelas saat sesuatu gagal, bukan diam/hang/crash.

Periksa dan perbaiki (laporkan dulu temuannya sebelum langsung mengubah kode, seperti pola audit-dulu di prompt Security Audit/Cleanup):
1. Semua provider AI down bersamaan → pesan error jelas ke user, bukan loading tanpa akhir
2. Koneksi database terputus saat mid-request → tidak boleh membuat data korup (misal pesan user tersimpan tapi status conversation tidak update)
3. Agent task terjebak melebihi `maxSteps` → pastikan benar-benar berhenti dan user diberi tahu, bukan diam di status `acting` selamanya
4. Streaming terputus di tengah jalan (user tutup tab / koneksi putus) → pastikan tidak ada proses backend yang terus jalan sia-sia tanpa ada yang menerima hasilnya
5. Input pesan kosong atau sangat panjang → validasi sebelum diproses, bukan dilempar mentah ke provider

Untuk tiap temuan, tulis: skenario, dampak saat ini, dan fix yang diusulkan. Tunggu approval sebelum eksekusi perubahan.
