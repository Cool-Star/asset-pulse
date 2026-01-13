<template>
  <svg
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="app-logo"
  >
    <defs>
      <linearGradient
        id="cyber-grad"
        x1="0"
        y1="0"
        x2="512"
        y2="512"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stop-color="#00f3ff" />
        <stop offset="100%" stop-color="#7000ff" />
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="15" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background Hexagon -->
    <path
      d="M256 30 L470 140 V372 L256 482 L42 372 V140 Z"
      fill="transparent"
      stroke="url(#cyber-grad)"
      stroke-width="24"
    />

    <!-- Pulse Line -->
    <path
      d="M100 256 H170 L210 130 L290 382 L330 256 H412"
      stroke="url(#cyber-grad)"
      stroke-width="32"
      stroke-linecap="round"
      stroke-linejoin="round"
      filter="url(#glow)"
    />

    <!-- Accent Dots -->
    <circle cx="412" cy="256" r="16" fill="#00f3ff" filter="url(#glow)" />
  </svg>
</template>

<style scoped>
.app-logo {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 8px rgba(0, 243, 255, 0.3));
}
</style>