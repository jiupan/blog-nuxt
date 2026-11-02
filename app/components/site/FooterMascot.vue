<template>
  <span class="footer-mascot" aria-hidden="true">
    <span class="mascot-peek">
      <span class="mascot-breathe">
        <img class="mascot-tail" src="/images/mascot/peach-tail.webp" alt="" width="256" height="256" loading="lazy" decoding="async">
        <span class="mascot-body">
          <img class="mascot-paw" src="/images/mascot/peach-paw.webp" alt="" width="256" height="256" loading="lazy" decoding="async">
          <img class="mascot-face is-open" src="/images/mascot/peach-body.webp" alt="" width="256" height="256" loading="lazy" decoding="async">
          <img class="mascot-face is-blink" src="/images/mascot/peach-blink.webp" alt="" width="256" height="256" loading="lazy" decoding="async">
        </span>
      </span>
    </span>
  </span>
</template>

<style scoped>
.footer-mascot {
  position: relative;
  display: block;
  width: 66px;
  height: 66px;
  isolation: isolate;
  pointer-events: none;
}

.mascot-peek {
  position: absolute;
  inset: 0;
  display: block;
  transform-origin: 55% 90%;
  transition: transform .4s cubic-bezier(.2, .8, .2, 1);
}

.mascot-breathe {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: 55% 95%;
  animation: mascot-breathe 5.6s ease-in-out infinite;
}

.footer-mascot img {
  position: absolute;
  display: block;
  max-width: none;
  object-fit: contain;
}

.mascot-tail {
  left: -1%;
  top: 0;
  width: 67%;
  height: 100%;
  transform-origin: 88% 90%;
  animation: mascot-tail 4.4s ease-in-out infinite;
}

.mascot-body {
  position: absolute;
  top: 4%;
  left: 28%;
  width: 78%;
  height: 96%;
}

.mascot-face {
  inset: 0;
  width: 100%;
  height: 100%;
  animation: mascot-eyes-open 6.4s step-end infinite;
}

.mascot-face.is-blink {
  opacity: 0;
  animation-name: mascot-eyes-closed;
}

.mascot-paw {
  top: 50%;
  left: 6%;
  width: 40%;
  height: 38%;
  /* Keep the shoulder fixed and let the body layers cover the attachment. */
  transform-origin: 82% 54%;
  transform: rotate(-28deg);
  animation: mascot-wave 7s ease-in-out infinite;
}

.back-top-button:hover .mascot-peek,
.back-top-button:focus-visible .mascot-peek {
  transform: translateY(-4px);
}

.back-top-button:hover .mascot-paw,
.back-top-button:focus-visible .mascot-paw {
  animation: mascot-greeting .85s ease-in-out infinite;
}

@keyframes mascot-breathe {
  0%, 100% { transform: translateY(1px) scale(1); }
  45% { transform: translateY(-1px) scale(1.015, 1.025); }
}

@keyframes mascot-tail {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(6deg); }
}

@keyframes mascot-wave {
  0%, 60%, 100% { transform: rotate(-28deg); }
  67%, 81% { transform: rotate(-38deg); }
  74%, 88% { transform: rotate(-18deg); }
}

@keyframes mascot-greeting {
  0%, 100% { transform: rotate(-38deg); }
  50% { transform: rotate(-18deg); }
}

@keyframes mascot-eyes-open {
  0%, 35%, 74%, 80%, 100% { opacity: 1; }
  33%, 72%, 78% { opacity: 0; }
}

@keyframes mascot-eyes-closed {
  0%, 35%, 74%, 80%, 100% { opacity: 0; }
  33%, 72%, 78% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .footer-mascot *,
  .footer-mascot .mascot-face,
  .back-top-button:hover .mascot-paw,
  .back-top-button:focus-visible .mascot-paw {
    animation: none;
    transition: none;
  }

  .back-top-button:hover .mascot-peek,
  .back-top-button:focus-visible .mascot-peek { transform: none; }
}
</style>
