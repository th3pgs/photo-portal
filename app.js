import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdHmdrgtLIdnCQ7w4BRyWncS7_nFcxdtA",
  authDomain: "editor-drop.firebaseapp.com",
  projectId: "editor-drop",
  storageBucket: "editor-drop.firebasestorage.app",
  messagingSenderId: "627419081969",
  appId: "1:627419081969:web:7d3ba2a53db5bcdcc90d50"
};

const CLOUDINARY_CLOUD_NAME = "ykfzqvzs";
const CLOUDINARY_PRESET = "photo_drop";
const ADMIN_EMAIL = "undercoverhaein@gmail.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let deadlineDate = null;
let timerInterval = null;
let cachedAdmin = false;

// Admin caching
onAuthStateChanged(auth, (user) => { if (user && user.email === ADMIN_EMAIL) cachedAdmin = true; });

function showToast(msg) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div"); t.className = "glass-toast"; t.innerText = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 4000);
}
window.showToast = showToast;

// Gate
const entryGate = document.getElementById("entryGate");
const video = document.getElementById("instructionVideo");
document.getElementById("enterSiteBtn").addEventListener("click", () => {
  entryGate.style.opacity = "0"; setTimeout(() => entryGate.classList.add("hidden"), 400);
  if (video.src) { video.volume = 1; video.play().catch(()=>{}); }
});

// Carousel Auto-Scroll Logic
const track = document.getElementById("carouselTrack");
let carouselDir = 1;
setInterval(() => {
  if (!track || track.scrollWidth <= track.clientWidth) return;
  const max = track.scrollWidth - track.clientWidth;
  if (track.scrollLeft >= max - 5) carouselDir = -1;
  if (track.scrollLeft <= 5) carouselDir = 1;
  track.scrollBy({ left: carouselDir * track.clientWidth, behavior: 'smooth' });
}, 4000);

document.getElementById("carPrev").addEventListener("click", () => track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' }));
document.getElementById("carNext").addEventListener("click", () => track.scrollBy({ left: track.clientWidth, behavior: 'smooth' }));

// Video
const ppBtn = document.getElementById("btnPlayPause");
const seek = document.getElementById("seekSlider");
const vol = document.getElementById("volumeSlider");
ppBtn.addEventListener("click", () => {
  if (video.paused) { video.play(); ppBtn.innerText = "⏸ Pause"; } else { video.pause(); ppBtn.innerText = "▶ Play"; }
});
document.getElementById("btnBack5").addEventListener("click", () => video.currentTime -= 5);
document.getElementById("btnFwd5").addEventListener("click", () => video.currentTime += 5);
video.addEventListener("timeupdate", () => seek.value = (100 / video.duration) * video.currentTime || 0);
seek.addEventListener("input", () => video.currentTime = video.duration * (seek.value / 100));
vol.addEventListener("input", () => video.volume = vol.value);

// DB Sync Config
onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    const d = snap.data();
    if (d.deadline) { deadlineDate = new Date(d.deadline); startDigitalCountdown(); }
    if (d.preview1 || d.preview2) {
      document.getElementById("previewSection").style.display = "block";
      if (d.preview1) { document.getElementById("ref1").src = d.preview1; document.getElementById("ref1").style.display = "block"; }
      if (d.preview2) { document.getElementById("ref2").src = d.preview2; document.getElementById("ref2").style.display = "block"; }
    }
    if (d.videoUrl) {
      document.getElementById("videoSection").style.display = "block";
      document.getElementById("videoSource").src = d.videoUrl; video.load();
    }
  }
});

// Digital Neon Clock
function startDigitalCountdown() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!deadlineDate) return;
    const diff = deadlineDate.getTime() - Date.now();
    const abs = Math.abs(diff);
    const h = Math.floor(abs / (1000 * 60 * 60)).toString().padStart(2, "0");
    const m = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
    const s = Math.floor((abs % (1000 * 60)) / 1000).toString().padStart(2, "0");

    document.getElementById("countdown").innerText = `${diff < 0 ? "-" : ""}${h}:${m}:${s}`;
    document.getElementById("timerStatus").textContent = diff < 0 ? "DEADLINE PASSED" : "Time remaining";
  }, 1000);
}

// User Submission Logic
let myId = localStorage.getItem("mySubId") || doc(collection(db, "submissions")).id;
let uploadTime = localStorage.getItem("mySubTime") || 0;

// Chess.com Leaderboard Sync
onSnapshot(query(collection(db, "submissions"), orderBy("time", "asc")), (snap) => {
  const orgList = document.getElementById("organizerList");
  const regList = document.getElementById("rosterList");
  const gallery = document.getElementById("adminGallery");
  orgList.innerHTML = ""; regList.innerHTML = ""; gallery.innerHTML = "";
  document.getElementById("rosterCounter").textContent = `${snap.size} Uploads`;
  let rank = 1;

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const id = docSnap.id;
    const canEdit = (id === myId && (Date.now() - uploadTime) < 300000); 
    const editBtn = canEdit ? `<button class="btn-edit-user" onclick="triggerUserEdit('${d.firstName}','${d.lastName}','${d.role}')">Edit</button>` : "";

    const cardHtml = `
      <div class="chess-row">
        ${!d.isOrganizer ? `<div class="chess-rank">${rank++}</div>` : `<div class="chess-rank"><span class="org-badge">ORG</span></div>`}
        <div class="chess-details">
          <span class="chess-name">${d.firstName} ${d.lastName}</span>
          <span class="chess-role">${d.role}</span>
        </div>
        <div class="chess-status">
          ${editBtn} <span class="chess-tick">✔</span>
        </div>
      </div>`;
    
    d.isOrganizer ? (orgList.innerHTML += cardHtml) : (regList.innerHTML += cardHtml);

    if (d.imageUrl) {
      gallery.innerHTML += `
        <div class="gallery-card" id="gal-${id}">
          <img src="${d.imageUrl}">
          <div class="gallery-info">
            <h4>${d.firstName} ${d.lastName}</h4><p>${d.role}</p>
            <div style="display:flex; gap:5px; margin-bottom: 10px;">
              <button class="btn-admin-action" style="flex:1" onclick="navigator.clipboard.writeText('${d.firstName} ${d.lastName} - ${d.role}')">Copy</button>
              <button class="btn-admin-action green-btn" style="flex:1" onclick="window.open('${d.imageUrl}')">Save</button>
            </div>
            <button class="btn-danger" onclick="showDeleteConfirm('${id}')">Delete Entry</button>
            <div class="del-req-box hidden" id="delbox-${id}">
              <input type="text" id="delinput-${id}" class="del-input" placeholder="Type 'delete'" autocomplete="off">
              <button class="btn-confirm-del" onclick="executeDelete('${id}')">Confirm</button>
            </div>
          </div>
        </div>`;
    }
  });
});

window.showDeleteConfirm = (id) => document.getElementById(`delbox-${id}`).classList.remove("hidden");
window.executeDelete = async (id) => {
  if (document.getElementById(`delinput-${id}`).value.toLowerCase() === "delete") {
    await deleteDoc(doc(db, "submissions", id)); showToast("Deleted.");
  } else { showToast("Type 'delete' exactly."); }
};

window.triggerUserEdit = (f, l, r) => {
  document.getElementById("firstName").value = f; document.getElementById("lastName").value = l; document.getElementById("role").value = r;
  document.getElementById("editNotice").classList.remove("hidden"); window.scrollTo({ top: 0, behavior: "smooth" });
};

// Upload Process
let selectedFile = null;
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) {
    selectedFile = e.target.files[0];
    document.getElementById("dropzoneContent").innerHTML = `<span style="font-size:2rem">✅</span><h3>${selectedFile.name}</h3><small>Ready for review</small>`;
  }
});

document.getElementById("reviewBtn").addEventListener("click", () => {
  const f = document.getElementById("firstName").value.trim(); const l = document.getElementById("lastName").value.trim(); const r = document.getElementById("role").value.trim();
  if (!f || !l || !r || !selectedFile) { showToast("Please fill all fields and select a picture."); return; }
  document.getElementById("uploadForm").classList.add("hidden"); document.getElementById("reviewContainer").classList.remove("hidden");
  document.getElementById("reviewName").innerText = `${f} ${l}`; document.getElementById("reviewRole").innerText = r;
  document.getElementById("reviewImage").src = URL.createObjectURL(selectedFile);
});

document.getElementById("cancelReviewBtn").addEventListener("click", () => {
  document.getElementById("uploadForm").classList.remove("hidden"); document.getElementById("reviewContainer").classList.add("hidden");
});

document.getElementById("confirmSubmitBtn").addEventListener("click", () => {
  document.getElementById("reviewContainer").classList.add("hidden"); document.getElementById("progressContainer").classList.remove("hidden");
  const fd = new FormData(); fd.append("file", selectedFile); fd.append("upload_preset", CLOUDINARY_PRESET);
  const xhr = new XMLHttpRequest(); xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const p = Math.round((e.loaded / e.total) * 100);
      document.getElementById("progressBar").style.width = p + "%"; document.getElementById("progressPercent").textContent = p + "%";
    }
  };
  xhr.onload = async () => {
    if (xhr.status === 200) {
      const res = JSON.parse(xhr.responseText);
      await setDoc(doc(db, "submissions", myId), {
        firstName: document.getElementById("firstName").value, lastName: document.getElementById("lastName").value, role: document.getElementById("role").value,
        imageUrl: res.secure_url, isOrganizer: false, time: serverTimestamp()
      });
      uploadTime = Date.now(); localStorage.setItem("mySubId", myId); localStorage.setItem("mySubTime", uploadTime);
      document.getElementById("uploadForm").reset(); selectedFile = null;
      document.getElementById("dropzoneContent").innerHTML = `<span style="font-size:2rem">📸</span><h3>Choose High-Quality Picture</h3><small>Click to browse files</small>`;
      document.getElementById("progressContainer").classList.add("hidden"); document.getElementById("successCard").classList.remove("hidden");
      showToast("Got something wrong? You got five minutes to edit.");
    } else { showToast("Upload failed."); document.getElementById("uploadForm").classList.remove("hidden"); }
  };
  xhr.send(fd);
});

document.getElementById("resetBtn").addEventListener("click", () => { document.getElementById("uploadForm").classList.remove("hidden"); document.getElementById("successCard").classList.add("hidden"); document.getElementById("editNotice").classList.add("hidden"); });

// Reliable Admin Overlay
let taps = 0, lastTap = 0;
document.getElementById("secretTrigger").addEventListener("click", () => {
  const now = Date.now(); if (now - lastTap < 500) taps++; else taps = 1; lastTap = now;
  if (taps === 3) {
    taps = 0;
    if (cachedAdmin) { document.getElementById("adminPanel").classList.remove("hidden"); } 
    else {
      signInWithPopup(auth, provider).then((res) => {
        if (res.user.email === ADMIN_EMAIL) document.getElementById("adminPanel").classList.remove("hidden"); else showToast("Access Denied.");
      });
    }
  }
});
document.getElementById("closeAdminBtn").addEventListener("click", () => document.getElementById("adminPanel").classList.add("hidden"));

// Admin Tabs & Actions
document.getElementById("tabSettings").addEventListener("click", (e) => { e.target.classList.add("active"); document.getElementById("tabGallery").classList.remove("active"); document.getElementById("viewSettings").classList.remove("hidden"); document.getElementById("viewGallery").classList.add("hidden"); });
document.getElementById("tabGallery").addEventListener("click", (e) => { e.target.classList.add("active"); document.getElementById("tabSettings").classList.remove("active"); document.getElementById("viewGallery").classList.remove("hidden"); document.getElementById("viewSettings").classList.add("hidden"); });

async function cloudUpload(file, type="image") {
  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`, { method: "POST", body: fd });
  return (await res.json()).secure_url;
}
document.getElementById("saveTimerBtn").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { deadline: new Date(document.getElementById("adminTimer").value).toISOString() }, { merge: true }); showToast("Timer Updated!"); });
document.getElementById("uploadVideoBtn").addEventListener("click", async () => { const f = document.getElementById("adminVideoFile").files[0]; if (!f) return; showToast("Uploading..."); const url = await cloudUpload(f, "video"); await setDoc(doc(db, "config", "settings"), { videoUrl: url }, { merge: true }); showToast("Video Live!"); });
document.getElementById("uploadImgBtn1").addEventListener("click", async () => { const f = document.getElementById("adminImgFile1").files[0]; if (!f) return; showToast("Uploading..."); const url = await cloudUpload(f); await setDoc(doc(db, "config", "settings"), { preview1: url }, { merge: true }); showToast("Pic 1 Saved!"); });
document.getElementById("uploadImgBtn2").addEventListener("click", async () => { const f = document.getElementById("adminImgFile2").files[0]; if (!f) return; showToast("Uploading..."); const url = await cloudUpload(f); await setDoc(doc(db, "config", "settings"), { preview2: url }, { merge: true }); showToast("Pic 2 Saved!"); });
document.getElementById("seedBtn").addEventListener("click", async () => {
  const f = document.getElementById("seedFirst"); const l = document.getElementById("seedLast"); const r = document.getElementById("seedRole");
  if (!f.value || !l.value) return;
  await setDoc(doc(collection(db, "submissions")), { firstName: f.value, lastName: l.value, role: r.value, isOrganizer: true, time: serverTimestamp() });
  f.value = ""; l.value = ""; r.value = ""; showToast("Organizer added!");
});
