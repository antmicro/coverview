<script setup>
import { ref } from "vue";

const emit = defineEmits(['file-selected']);

const isDragging = ref(false);

function handleDragOver(event) {
    event.preventDefault();
    isDragging.value = true;
}

function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        isDragging.value = false;
    }
}

function handleDrop(event) {
    event.preventDefault();
    isDragging.value = false;

    const file = event.dataTransfer.files[0];
    if (file) {
        const fileInputEl = document.getElementById('fileInput');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputEl.files = dataTransfer.files;

        const changeEvent = new Event('change', { bubbles: true });
        fileInputEl.dispatchEvent(changeEvent);
    }
}
</script>

<template>
    <div class="landing-page" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
        <img src="../assets/logo.svg" class="logo" />
        <h1>Interactive coverage dashboards</h1>
        <p>Data-driven interactive coverage dashboards for aggregating SW, RTL and other test execution results, easy to integrate with existing workflows and CI setups</p>
        <div class="upload-zone" :class="{ 'dragging': isDragging }">
            <div class="upload-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"
                    fill="var(--accent-primary)">
                    <path
                        d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
                </svg>
            </div>
            <div class="upload-text">
                <h3>Drag & drop your file</h3>
                <p>Upload .xz, .zip, or .info files</p>
            </div>
            <div class="upload-divider">
                <span>OR</span>
            </div>
            <label for="fileInput" class="upload-button"
                style="background-color: var(--accent-background); color: var(--accent-primary); border-color: var(--accent-border);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M5 4V10.1788V10.1538V20V4ZM5.30775 21.5C4.80258 21.5 4.375 21.325 4.025 20.975C3.675 20.625 3.5 20.1974 3.5 19.6923V4.30775C3.5 3.80258 3.675 3.375 4.025 3.025C4.375 2.675 4.80258 2.5 5.30775 2.5H13.25L18.5 7.75V10.5095C18.2602 10.4147 18.0152 10.3426 17.7652 10.2932C17.5152 10.2439 17.2602 10.2058 17 10.1788V8.5H12.5V4H5.30775C5.23075 4 5.16025 4.03208 5.09625 4.09625C5.03208 4.16025 5 4.23075 5 4.30775V19.6923C5 19.7693 5.03208 19.8398 5.09625 19.9038C5.16025 19.9679 5.23075 20 5.30775 20H11.2078C11.4039 20.2975 11.6238 20.5722 11.8673 20.824C12.1109 21.076 12.375 21.3013 12.6595 21.5H5.30775ZM16.5 19.1538C17.2448 19.1538 17.8733 18.8977 18.3855 18.3855C18.8977 17.8733 19.1538 17.2448 19.1538 16.5C19.1538 15.7552 18.8977 15.1267 18.3855 14.6145C17.8733 14.1023 17.2448 13.8463 16.5 13.8463C15.7552 13.8463 15.1267 14.1023 14.6145 14.6145C14.1023 15.1267 13.8462 15.7552 13.8462 16.5C13.8462 17.2448 14.1023 17.8733 14.6145 18.3855C15.1267 18.8977 15.7552 19.1538 16.5 19.1538ZM21.6 22.6443L18.8615 19.9057C18.5243 20.1519 18.1548 20.3382 17.753 20.4645C17.351 20.5907 16.9333 20.6538 16.5 20.6538C15.3462 20.6538 14.3654 20.2499 13.5578 19.4423C12.7501 18.6346 12.3463 17.6538 12.3463 16.5C12.3463 15.3462 12.7501 14.3654 13.5578 13.5578C14.3654 12.7501 15.3462 12.3463 16.5 12.3463C17.6538 12.3463 18.6346 12.7501 19.4423 13.5578C20.2499 14.3654 20.6538 15.3462 20.6538 16.5C20.6538 16.9333 20.5907 17.351 20.4645 17.753C20.3382 18.1548 20.1519 18.5243 19.9057 18.8615L22.6443 21.6L21.6 22.6443Z"
                        fill="var(--accent-primary)" />
                </svg>
                Browse files
                <input type="file" id="fileInput" accept=".xz, .zip, .info" style="display: none;">
            </label>
        </div>
    </div>
</template>

<style>
.logo {
    height: 2rem;
    width: 100%;
    margin-bottom: 1rem;
}

.landing-page {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: black;
    background-image: url('../assets/placeholder.png');
    background-size: cover;
    background-position: center;
    position: relative;
    padding: 0 1rem;
}

.landing-page h1 {
    color: var(--text-primary);
    font-size: 2.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    line-height: 100%;
}

@media (max-width: 640px) {
    .landing-page h1 {
        font-size: 2rem;
    }
}

.landing-page p {
    font-size: 1rem;
    color: var(--text-muted);
    line-height: 155.556%;
    max-width: 700px;
    margin-bottom: 1rem;
}

.upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 600px;
    aspect-ratio: 16/9;
    border: 2px dashed var(--border-primary);
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
    backdrop-filter: blur(0.5rem);
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.3);
}

.upload-zone.dragging {
    border-color: var(--accent-primary);
    background-color: rgba(0, 0, 0, 0.5);
}

.upload-icon {
    margin-bottom: 1rem;
}

.upload-text {
    text-align: center;
}

.upload-text h3 {
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.upload-text p {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin: 0;
}

.upload-divider {
    width: 100%;
    text-align: center;
    position: relative;
    margin: 1rem 0;
}

.upload-divider::before,
.upload-divider::after {
    content: "";
    position: absolute;
    top: 50%;
    width: calc(50% - 25px);
    height: 1px;
    background-color: var(--border-primary);
}

.upload-divider::before {
    left: 0;
}

.upload-divider::after {
    right: 0;
}

.upload-divider span {
    display: inline-block;
    padding: 0 10px;
    position: relative;
    z-index: 1;
    color: var(--text-muted);
    font-size: 0.85rem;
    background-color: rgba(0, 0, 0, 0.5);
}

.upload-button {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    width: auto;
    min-width: 150px;
}

.upload-button:hover {
    filter: brightness(125%);
}

@media (max-width: 640px) {
    .upload-zone {
        aspect-ratio: auto;
        min-height: 200px;
        padding: 1.5rem;
    }

    .upload-icon svg {
        height: 36px;
        width: 36px;
    }

    .upload-text h3 {
        font-size: 1rem;
    }

    .upload-text p {
        font-size: 0.8rem;
    }
}
</style>
