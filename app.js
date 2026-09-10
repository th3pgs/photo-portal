import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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

// Toasts
function showToast(msg) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "glass-toast";
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Entry Gate & Video AutoPlay
const entryGate = document.getElementById("entryGate");
const video = document.getElementById("instructionVideo");

document.getElementById("enterSiteBtn").addEventListener("click", () => {
  entryGate.style.opacity = "0";
  setTimeout(() => entryGate.classList.add("hidden"), 400);
  
  if (video.src && video.src !== window.location.href) {
    video.volume = 1;
    video.play().catch(() => {}); // Try to autoplay when they click Go In
  }
});

// Custom Video Player Logic
const playPauseBtn = document.getElementById("btnPlayPause");
const seekSlider = document.getElementById("seekSlider");
const volumeSlider = document.getElementById("volumeSlider");

playPauseBtn.addEventListener("click", () => {
  if (video.paused) { video.play(); playPauseBtn.innerText = "⏸ Pause"; } 
  else { video.pause(); playPauseBtn.innerText = "▶ Play"; }
});
document.getElementById("btnBack5").addEventListener("click", () => video.currentTime -= 5);
document.getElementById("btnFwd5").addEventListener("click", () => video.currentTime += 5);

video.addEventListener("timeupdate", () => {
  const val = (100 / video.duration) * video.currentTime;
  seekSlider.value = val || 0;
});
seekSlider.addEventListener("input", () => {
  video.currentTime = video.duration * (seekSlider.value / 100);
});
volumeSlider.addEventListener("input", () => {
  video.volume = volumeSlider.value;
});

// Realtime Config Sync
onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    const d = snap.data();
    if (d.deadline) { deadlineDate = new Date(d.deadline); startClock(); }
    if (d.preview1 || d.preview2) {
      document.getElementById("previewSection").style.display = "block";
      if (d.preview1) document.getElementById("ref1").src = d.preview1;
      if (d.preview2) document.getElementById("ref2").src = d.preview2;
    }
    if (d.videoUrl) {
      document.getElementById("videoSection").style.display = "block";
      document.getElementById("videoSource").src = d.videoUrl;
      video.load();
    }
  }
});

// Digital Clock
function startClock() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!deadlineDate) return;
    const diff = deadlineDate.getTime() - Date.now();
    const absDiff = Math.abs(diff);
    const h = Math.floor(absDiff / (1000 * 60 * 60)).toString().padStart(2, "0");
    const m = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
    const s = Math.floor((absDiff % (1000 * 60)) / 1000).toString().padStart(2, "0");
    
    document.getElementById("countdown").textContent = `${diff < 0 ? "-" : ""}${h}:${m}:${s}`;
    document.getElementById("timerStatus").textContent = diff < 0 ? "DEADLINE PASSED" : "Time remaining before deadline";
  }, 1000);
}

// Leaderboard Sync
onSnapshot(query(collection(db, "submissions"), orderBy("time", "asc")), (snap) => {
  const orgList = document.getElementById("organizerList");
  const regList = document.getElementById("rosterList");
  const adminGallery = document.getElementById("adminGallery");
  
  orgList.innerHTML = ""; regList.innerHTML = ""; adminGallery.innerHTML = "";
  document.getElementById("rosterCounter").textContent = `${snap.size} Uploads`;

  let rankCounter = 1;

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const name = `${d.firstName} ${d.lastName}`;
    
    // Front End Leaderboard
    if (d.isOrganizer) {
      orgList.innerHTML += `
        <div class="roster-card" style="border-color: #3b82f6; background: #eff6ff;">
          <div class="roster-left">
            <div class="roster-info"><strong>⭐ ${name}</strong><span>${d.role}</span></div>
          </div>
          <span class="status-done">Completed</span>
        </div>`;
    } else {
      regList.innerHTML += `
        <div class="roster-card">
          <div class="roster-left">
            <span class="rank-num">#${rankCounter}</span>
            <div class="roster-info"><strong>${name}</strong><span>${d.role}</span></div>
          </div>
          <span class="status-done">Completed</span>
        </div>`;
      rankCounter++;
    }

    // Admin Gallery Build
    if (d.imageUrl) {
      adminGallery.innerHTML += `
        <div class="gallery-card">
          <img src="${d.imageUrl}">
          <div class="gallery-info">
            <h4>${name}</h4>
            <p>${d.role}</p>
            <div class="gallery-actions">
              <button class="btn-small btn-copy" onclick="navigator.clipboard.writeText('${name} - ${d.role}'); showToast('Copied!')">Copy Info</button>
              <button class="btn-small btn-dl" onclick="window.open('${d.imageUrl}', '_blank')">Download</button>
            </div>
          </div>
        </div>`;
    }
  });
});

// Make showToast available globally for inline onclick
window.showToast = showToast;

// Upload Flow
const myId = localStorage.getItem("mySubId") || doc(collection(db, "submissions")).id;
if (localStorage.getItem("mySubId")) {
  document.getElementById("editNotice").classList.remove("hidden");
  document.getElementById("submitBtn").textContent = "Update Upload";
}

document.getElementById("fileInput").addEventListener("change", (e) => {
  if (e.target.files[0]) document.getElementById("fileNameDisplay").textContent = e.target.files[0].name;
});

document.getElementById("uploadForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  document.getElementById("submitBtn").disabled = true;
  document.getElementById("progressContainer").classList.remove("hidden");

  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_PRESET);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

  xhr.upload.onprogress = (evt) => {
    if (evt.lengthComputable) {
      const p = Math.round((evt.loaded / evt.total) * 100);
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
        isOrganizer: false, // Normal users upload as standard rank
        time: serverTimestamp()
      });
      localStorage.setItem("mySubId", myId);
      document.getElementById("formCard").classList.add("hidden");
      document.getElementById("successCard").classList.remove("hidden");
    } else {
      showToast("Upload failed.");
      document.getElementById("submitBtn").disabled = false;
    }
  };
  xhr.send(fd);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("formCard").classList.remove("hidden");
  document.getElementById("successCard").classList.add("hidden");
  document.getElementById("submitBtn").disabled = false;
  document.getElementById("progressContainer").classList.add("hidden");
});

// Admin Login (Triple Click Footer)
let taps = 0; let lastTap = 0;
document.getElementById("secretTrigger").addEventListener("click", () => {
  const now = Date.now();
  if (now - lastTap < 500) taps++; else taps = 1;
  lastTap = now;
  if (taps === 3) {
    taps = 0;
    signInWithPopup(auth, provider).then((res) => {
      if (res.user.email === ADMIN_EMAIL) document.getElementById("adminPanel").classList.remove("hidden");
      else showToast("Access Denied.");
    });
  }
});
document.getElementById("closeAdminBtn").addEventListener("click", () => document.getElementById("adminPanel").classList.add("hidden"));

// Admin Tabs
document.getElementById("tabSettings").addEventListener("click", (e) => {
  e.target.classList.add("active"); document.getElementById("tabGallery").classList.remove("active");
  document.getElementById("viewSettings").classList.remove("hidden"); document.getElementById("viewGallery").classList.add("hidden");
});
document.getElementById("tabGallery").addEventListener("click", (e) => {
  e.target.classList.add("active"); document.getElementById("tabSettings").classList.remove("active");
  document.getElementById("viewGallery").classList.remove("hidden"); document.getElementById("viewSettings").classList.add("hidden");
});

// Admin Save Functions
async function cloudUpload(file, type="image") {
  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`, { method: "POST", body: fd });
  const data = await res.json(); return data.secure_url;
}
document.getElementById("saveTimerBtn").addEventListener("click", async () => {
  await setDoc(doc(db, "config", "settings"), { deadline: new Date(document.getElementById("adminTimer").value).toISOString() }, { merge: true });
  showToast("Timer Updated!");
});
document.getElementById("uploadVideoBtn").addEventListener("click", async () => {
  const f = document.getElementById("adminVideoFile").files[0]; if (!f) return;
  showToast("Uploading video...");
  const url = await cloudUpload(f, "video");
  await setDoc(doc(db, "config", "settings"), { videoUrl: url }, { merge: true });
  showToast("Video Live!");
});
document.getElementById("uploadImgBtn1").addEventListener("click", async () => {
  const f = document.getElementById("adminImgFile1").files[0]; if (!f) return; showToast("Uploading...");
  const url = await cloudUpload(f); await setDoc(doc(db, "config", "settings"), { preview1: url }, { merge: true }); showToast("Picture 1 Saved!");
});
document.getElementById("uploadImgBtn2").addEventListener("click", async () => {
  const f = document.getElementById("adminImgFile2").files[0]; if (!f) return; showToast("Uploading...");
  const url = await cloudUpload(f); await setDoc(doc(db, "config", "settings"), { preview2: url }, { merge: true }); showToast("Picture 2 Saved!");
});
document.getElementById("seedBtn").addEventListener("click", async () => {
  const f = document.getElementById("seedFirst").value;
  const l = document.getElementById("seedLast").value;
  const r = document.getElementById("seedRole").value;
  if (!f || !l) return;
  await setDoc(doc(collection(db, "submissions")), { firstName: f, lastName: l, role: r, isOrganizer: true, time: serverTimestamp() });
  showToast("Organizer added!");
});
