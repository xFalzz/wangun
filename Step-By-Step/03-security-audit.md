# Prompt: Temukan Celah Keamanan — Wangun

Berperanlah sebagai application security engineer yang melakukan audit pre-launch pada codebase Wangun ini (platform Agentic AI Chat + Router-as-a-Service + IDE).

Review untuk kelemahan umum:
- Kelemahan autentikasi dan session handling
- Celah otorisasi (bisa nggak user A akses data/percakapan/workspace user B?)
- Secret, key, atau token hardcoded; apapun sensitif yang terekspos di client-side
- Risiko injection (SQL, NoSQL, command, XSS)
- API route yang tidak dilindungi atau tidak divalidasi
- Input validation dan sanitization yang hilang
- Rate limiting / proteksi brute force yang hilang
- Insecure direct object reference
- CORS terlalu longgar, security header hilang, cookie flag tidak aman
- Dependency yang sudah diketahui rentan
- Data sensitif yang bocor ke log atau error response

Plus risiko yang SPESIFIK untuk arsitektur Wangun — jangan lewatkan ini:
- **API key (Router-as-a-Service)**: apakah key disimpan sebagai hash (bukan plain text)? Apakah key ditampilkan lebih dari sekali? Apakah endpoint `/v1/chat/completions` benar-benar reject request tanpa key valid sebelum diteruskan ke provider (cegah kebocoran kuota provider gratis)?
- **Isolasi kuota internal vs eksternal**: apakah traffic `source=api_external` benar-benar tidak bisa menghabiskan kuota yang seharusnya untuk `source=internal_chat`, atau sebaliknya?
- **Tool `run_terminal` dan `write_file` (IDE)**: apakah ada path traversal (mis. `../../` keluar dari workspace)? Apakah command injection mungkin lewat `action_input` yang berasal dari output model? Apakah command berisiko benar-benar wajib konfirmasi user sebelum eksekusi?
- **Isolasi sandbox/container**: apakah satu workspace container bisa mengakses filesystem/proses/jaringan workspace user lain atau server utama?
- **Validasi output JSON dari model AI**: apakah `action`/`action_input` dari model divalidasi tipenya sebelum dieksekusi sebagai tool call, atau dipercaya mentah-mentah?
- **Agent loop runaway**: apakah `maxSteps` benar-benar dipaksakan di semua jalur (chat, IDE), sehingga tidak ada skenario biaya token/compute membengkak tak terkendali?

Untuk tiap temuan, berikan:
- Severity: Critical / High / Medium / Low
- File dan baris
- Cara nyatanya dieksploitasi
- Fix kode yang pasti

Lalu urutkan semua temuan berdasarkan severity. JANGAN ubah kode apapun sebelum saya approve. Kalau satu kategori bersih, katakan eksplisit, jangan diam saja.
