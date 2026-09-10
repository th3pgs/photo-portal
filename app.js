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

// Authenticate Silently for Zero-Lag Admin
onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL) cachedAdmin = true;
});

// Toast Engine
function showToast(msg) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div"); t.className = "glass-toast"; t.innerText = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 4000);
}
window.showToast = showToast;

// Entry Gate
const entryGate = document.getElementById("entryGate");
const video = document.getElementById("instructionVideo");
document.getElementById("enterSiteBtn").addEventListener("click", () => {
  entryGate.style.opacity = "0"; setTimeout(() => entryGate.classList.add("hidden"), 400);
  if (video.src) { video.volume = 1; video.play().catch(()=>{}); }
});

// Video Controls
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

// Realtime Config Sync
onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    const d = snap.data();
    if (d.deadline) { deadlineDate = new Date(d.deadline); startPaperClock(); }
    if (d.preview1 || d.preview2) {
      document.getElementById("previewSection").style.display = "block";
      if (d.preview1) document.getElementById("ref1").src = d.preview1;
      if (d.preview2) document.getElementById("ref2").src = d.preview2;
    }
    if (d.videoUrl) {
      document.getElementById("videoSection").style.display = "block";
      document.getElementById("videoSource").src = d.videoUrl; video.load();
    }
  }
});

// Paper Flip Clock Logic
function startPaperClock() {
  if (timerInterval) clearInterval(timerInterval);
  const elH = document.getElementById("hours");
  const elM = document.getElementById("minutes");
  const elS = document.getElementById("seconds");

  timerInterval = setInterval(() => {
    if (!deadlineDate) return;
    const diff = deadlineDate.getTime() - Date.now();
    const abs = Math.abs(diff);
    const h = Math.floor(abs / (1000 * 60 * 60)).toString().padStart(2, "0");
    const m = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
    const s = Math.floor((abs % (1000 * 60)) / 1000).toString().padStart(2, "0");

    if(elH.innerText !== h) elH.innerText = h;
    if(elM.innerText !== m) elM.innerText = m;
    if(elS.innerText !== s) elS.innerText = s;
    document.getElementById("timerStatus").textContent = diff < 0 ? "DEADLINE PASSED" : "Ticking...";
  }, 1000);
}

// User Submission & 5-Minute Local State
let myId = localStorage.getItem("mySubId") || doc(collection(db, "submissions")).id;
let uploadTime = localStorage.getItem("mySubTime") || 0;

// Leaderboard & Admin Gallery Sync
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
    const name = `${d.firstName} ${d.lastName}`;
    
    // 5-Minute Edit Check
    const canEdit = (id === myId && (Date.now() - uploadTime) < 300000); 
    const editBtn = canEdit ? `<button class="btn-edit-user" onclick="triggerUserEdit('${d.firstName}','${d.lastName}','${d.role}')">Edit</button>` : "";

    const cardHtml = `
      <div class="roster-card" ${d.isOrganizer ? 'style="border-color:#3b82f6; background:#eff6ff;"' : ''}>
        <div class="roster-left">
          ${!d.isOrganizer ? `<span class="rank-num">#${rank++}</span>` : ''}
          <div class="roster-info"><strong>${d.isOrganizer ? '⭐ ' : ''}${name}</strong><span>${d.role}</span></div>
        </div>
        <div>${editBtn} <span class="status-done" style="color:#10b981; font-weight:bold; font-size:0.8rem;">✔ Completed</span></div>
      </div>`;
    
    d.isOrganizer ? (orgList.innerHTML += cardHtml) : (regList.innerHTML += cardHtml);

    // Admin Gallery Build (With Safe Delete)
    if (d.imageUrl) {
      gallery.innerHTML += `
        <div class="gallery-card" id="gal-${id}">
          <img src="${d.imageUrl}">
          <div class="gallery-info">
            <h4>${name}</h4><p>${d.role}</p>
            <div style="display:flex; gap:5px; margin-bottom: 10px;">
              <button class="btn-admin-action" style="flex:1" onclick="navigator.clipboard.writeText('${name} - ${d.role}')">Copy</button>
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

// Admin Delete Logic
window.showDeleteConfirm = (id) => document.getElementById(`delbox-${id}`).classList.remove("hidden");
window.executeDelete = async (id) => {
  if (document.getElementById(`delinput-${id}`).value.toLowerCase() === "delete") {
    await deleteDoc(doc(db, "submissions", id));
    showToast("Entry permanently deleted.");
  } else { showToast("Type 'delete' exactly to confirm."); }
};

// Edit Pre-filler
window.triggerUserEdit = (f, l, r) => {
  document.getElementById("firstName").value = f;
  document.getElementById("lastName").value = l;
  document.getElementById("role").value = r;
  document.getElementById("editNotice").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast("Ready to overwrite your previous entry.");
};

// File Selection & Review Pipeline
let selectedFile = null;
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) {
    selectedFile = e.target.files[0];
    document.getElementById("dropzoneContent").innerHTML = `<span style="font-size:2rem">✅</span><h3>${selectedFile.name}</h3><small>Ready for review</small>`;
  }
});

document.getElementById("reviewBtn").addEventListener("click", () => {
  const f = document.getElementById("firstName").value.trim();
  const l = document.getElementById("lastName").value.trim();
  const r = document.getElementById("role").value.trim();
  if (!f || !l || !r || !selectedFile) { showToast("Please fill all fields and select a picture."); return; }
  
  // Show Review UI
  document.getElementById("uploadForm").classList.add("hidden");
  document.getElementById("reviewContainer").classList.remove("hidden");
  document.getElementById("reviewName").innerText = `${f} ${l}`;
  document.getElementById("reviewRole").innerText = r;
  document.getElementById("reviewImage").src = URL.createObjectURL(selectedFile);
});

document.getElementById("cancelReviewBtn").addEventListener("click", () => {
  document.getElementById("uploadForm").classList.remove("hidden");
  document.getElementById("reviewContainer").classList.add("hidden");
});

// Final Confirm & Upload
document.getElementById("confirmSubmitBtn").addEventListener("click", () => {
  document.getElementById("reviewContainer").classList.add("hidden");
  document.getElementById("progressContainer").classList.remove("hidden");

  const fd = new FormData(); fd.append("file", selectedFile); fd.append("upload_preset", CLOUDINARY_PRESET);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const p = Math.round((e.loaded / e.total) * 100);
      document.getElementById("progressBar").style.width = p + "%";
      document.getElementById("progressPercent").textContent = p + "%";
    }
  };

  xhr.onload = async () => {
    if (xhr.status === 200) {
      const res = JSON.parse(xhr.responseText);
      await setDoc(doc(db, "submissions", myId), {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        role: document.getElementById("role").value,
        imageUrl: res.secure_url,
        isOrganizer: false,
        time: serverTimestamp()
      });
      
      // Save 5 min local state
      uploadTime = Date.now();
      localStorage.setItem("mySubId", myId);
      localStorage.setItem("mySubTime", uploadTime);

      // Clear Inputs
      document.getElementById("uploadForm").reset();
      selectedFile = null;
      document.getElementById("dropzoneContent").innerHTML = `<span style="font-size:2rem">📸</span><h3>Choose High-Quality Picture</h3><small>Click to browse files</small>`;
      
      document.getElementById("progressContainer").classList.add("hidden");
      document.getElementById("successCard").classList.remove("hidden");
      showToast("Got something wrong? You got five minutes to edit.");
    } else {
      showToast("Upload failed.");
      document.getElementById("uploadForm").classList.remove("hidden");
    }
  };
  xhr.send(fd);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("uploadForm").classList.remove("hidden");
  document.getElementById("successCard").classList.add("hidden");
  document.getElementById("editNotice").classList.add("hidden");
});

// Fullscreen Admin (Zero-Lag + Minimap)
let taps = 0, lastTap = 0;
const openAdmin = () => {
  document.body.classList.add("admin-active");
  document.getElementById("adminPanel").classList.add("open");
  showToast("Flight Control Active.");
};

document.getElementById("secretTrigger").addEventListener("click", () => {
  const now = Date.now();
  if (now - lastTap < 500) taps++; else taps = 1;
  lastTap = now;
  if (taps === 3) {
    taps = 0;
    if (cachedAdmin) { openAdmin(); } 
    else {
      signInWithPopup(auth, provider).then((res) => {
        if (res.user.email === ADMIN_EMAIL) openAdmin(); else showToast("Access Denied.");
      });
    }
  }
});
document.getElementById("closeAdminBtn").addEventListener("click", () => {
  document.body.classList.remove("admin-active");
  document.getElementById("adminPanel").classList.remove("open");
});

// Admin Tabs
document.getElementById("tabSettings").addEventListener("click", (e) => {
  e.target.classList.add("active"); document.getElementById("tabGallery").classList.remove("active");
  document.getElementById("viewSettings").classList.remove("hidden"); document.getElementById("viewGallery").classList.add("hidden");
});
document.getElementById("tabGallery").addEventListener("click", (e) => {
  e.target.classList.add("active"); document.getElementById("tabSettings").classList.remove("active");
  document.getElementById("viewGallery").classList.remove("hidden"); document.getElementById("viewSettings").classList.add("hidden");
});

// Admin Actions
async function cloudUpload(file, type="image") {
  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`, { method: "POST", body: fd });
  return (await res.json()).secure_url;
}
document.getElementById("saveTimerBtn").addEventListener("click", async () => {
  await setDoc(doc(db, "config", "settings"), { deadline: new Date(document.getElementById("adminTimer").value).toISOString() }, { merge: true });
  showToast("Timer Updated!");
});
document.getElementById("uploadVideoBtn").addEventListener("click", async () => {
  const f = document.getElementById("adminVideoFile").files[0]; if (!f) return; showToast("Uploading...");
  const url = await cloudUpload(f, "video"); await setDoc(doc(db, "config", "settings"), { videoUrl: url }, { merge: true }); showToast("Video Live!");
});
document.getElementById("uploadImgBtn1").addEventListener("click", async () => {
  const f = document.getElementById("adminImgFile1").files[0]; if (!f) return; showToast("Uploading...");
  const url = await cloudUpload(f); await setDoc(doc(db, "config", "settings"), { preview1: url }, { merge: true }); showToast("Pic 1 Saved!");
});
document.getElementById("uploadImgBtn2").addEventListener("click", async () => {
  const f = document.getElementById("adminImgFile2").files[0]; if (!f) return; showToast("Uploading...");
  const url = await cloudUpload(f); await setDoc(doc(db, "config", "settings"), { preview2: url }, { merge: true }); showToast("Pic 2 Saved!");
});
document.getElementById("seedBtn").addEventListener("click", async () => {
  const f = document.getElementById("seedFirst"); const l = document.getElementById("seedLast"); const r = document.getElementById("seedRole");
  if (!f.value || !l.value) return;
  await setDoc(doc(collection(db, "submissions")), { firstName: f.value, lastName: l.value, role: r.value, isOrganizer: true, time: serverTimestamp() });
  f.value = ""; l.value = ""; r.value = ""; showToast("Organizer added!");
});
