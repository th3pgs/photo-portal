import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// 1. YOUR EXACT KEYS
const firebaseConfig = {
  apiKey: "AIzaSyCdHmdrgtLIdnCQ7w4BRyWncS7_nFcxdtA",
  authDomain: "editor-drop.firebaseapp.com",
  projectId: "editor-drop",
  storageBucket: "editor-drop.firebasestorage.app",
  messagingSenderId: "627419081969",
  appId: "1:627419081969:web:7d3ba2a53db5bcdcc90d50"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let deadlineDate = null;
let timerInterval = null;

// 2. LIVE UPDATES & TIMER
onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    const data = snap.data();
    
    // Setup Timer
    if (data.deadline) {
      deadlineDate = new Date(data.deadline);
      startTimer();
    }
    
    // Setup Previews
    if (data.preview1) { document.getElementById("ref1").src = data.preview1; document.getElementById("ref1").style.display = "block"; }
    if (data.preview2) { document.getElementById("ref2").src = data.preview2; document.getElementById("ref2").style.display = "block"; }
    
    // Setup Video
    if (data.videoUrl) {
      document.getElementById("videoIframe").src = data.videoUrl;
      document.getElementById("videoContainer").style.display = "block";
    }
  }
});

// Load Leaderboard
onSnapshot(query(collection(db, "submissions"), orderBy("time", "asc")), (snap) => {
  const list = document.getElementById("rosterList");
  list.innerHTML = "";
  snap.forEach(docSnap => {
    const d = docSnap.data();
    const isLate = d.isDelayed ? `<span class="status-red">⚠ Delayed</span>` : `<span class="status-green">✔ Uploaded</span>`;
    list.innerHTML += `
      <div class="roster-item">
        <div><strong>${d.firstName} ${d.lastName}</strong><br><small style="color:gray">${d.role}</small></div>
        <div>${isLate}</div>
      </div>
    `;
  });
});

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!deadlineDate) return;
    const diff = deadlineDate.getTime() - new Date().getTime();
    const absDiff = Math.abs(diff);
    
    const h = Math.floor(absDiff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const m = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const s = Math.floor((absDiff % (1000 * 60)) / 1000).toString().padStart(2, '0');
    
    const timerText = document.getElementById("countdown");
    if (diff < 0) {
      timerText.innerText = `-${h}:${m}:${s}`;
      timerText.classList.add("red");
      document.getElementById("timerStatus").innerText = "OVERDUE - Late uploads logged in red.";
    } else {
      timerText.innerText = `${h}:${m}:${s}`;
      timerText.classList.remove("red");
      document.getElementById("timerStatus").innerText = "Time Remaining";
    }
  }, 1000);
}

// 3. EDIT/UPLOAD LOGIC
const myId = localStorage.getItem("mySubmissionId") || doc(collection(db, "submissions")).id;
if (localStorage.getItem("mySubmissionId")) {
  document.getElementById("editNotice").style.display = "block";
  document.getElementById("submitBtn").innerText = "Update Submission";
}

document.getElementById("uploadForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  document.getElementById("submitBtn").disabled = true;
  document.getElementById("progressContainer").style.display = "block";

  // Upload to Cloudinary using your specific Cloud Name
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "photo_drop");

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "https://api.cloudinary.com/v1_1/ykfzqvzs/image/upload");

  xhr.upload.onprogress = (evt) => {
    if (evt.lengthComputable) {
      const percent = Math.round((evt.loaded / evt.total) * 100);
      document.getElementById("progressBar").style.width = percent + "%";
      document.getElementById("progressBar").innerText = percent + "%";
    }
  };

  xhr.onload = async () => {
    if (xhr.status === 200) {
      const resp = JSON.parse(xhr.responseText);
      const isLate = deadlineDate ? new Date() > deadlineDate : false;
      
      // Save to Firebase Database
      await setDoc(doc(db, "submissions", myId), {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        role: document.getElementById("role").value,
        imageUrl: resp.secure_url,
        isDelayed: isLate,
        time: serverTimestamp()
      });

      localStorage.setItem("mySubmissionId", myId); // Remembers user for edits

      document.getElementById("formCard").style.display = "none";
      document.getElementById("successCard").style.display = "block";
    } else {
      alert("Upload failed. Ensure Cloudinary Unsigned preset is exactly 'photo_drop'.");
      document.getElementById("submitBtn").disabled = false;
    }
  };
  xhr.send(formData);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("formCard").style.display = "block";
  document.getElementById("successCard").style.display = "none";
  document.getElementById("submitBtn").disabled = false;
  document.getElementById("progressContainer").style.display = "none";
});

// 4. SECRET ADMIN LOGIN (TRIPLE TAP)
let taps = 0;
document.getElementById("secretTrigger").addEventListener("click", () => {
  taps++;
  if (taps === 3) {
    signInWithPopup(auth, provider).then((res) => {
      if (res.user.email === "undercoverhaein@gmail.com") {
        document.getElementById("adminPanel").style.display = "block";
      } else {
        alert("Access Denied");
      }
    });
    taps = 0;
  }
  setTimeout(() => taps = 0, 1000);
});

document.getElementById("closeAdminBtn").addEventListener("click", () => {
  document.getElementById("adminPanel").style.display = "none";
});

// Admin Panel Save Buttons
document.getElementById("saveTimerBtn").addEventListener("click", async () => {
  await setDoc(doc(db, "config", "settings"), { deadline: document.getElementById("adminTimer").value }, { merge: true });
  alert("Timer updated!");
});
document.getElementById("saveVideoBtn").addEventListener("click", async () => {
  await setDoc(doc(db, "config", "settings"), { videoUrl: document.getElementById("adminVideo").value }, { merge: true });
  alert("Video updated!");
});
document.getElementById("saveImagesBtn").addEventListener("click", async () => {
  await setDoc(doc(db, "config", "settings"), { 
    preview1: document.getElementById("adminImg1").value, 
    preview2: document.getElementById("adminImg2").value 
  }, { merge: true });
  alert("Images updated!");
});
document.getElementById("seedBtn").addEventListener("click", async () => {
  await setDoc(doc(collection(db, "submissions")), {
    firstName: document.getElementById("seedFirst").value,
    lastName: document.getElementById("seedLast").value,
    role: document.getElementById("seedRole").value,
    isDelayed: false,
    time: serverTimestamp()
  });
  alert("User added to leaderboard!");
});
