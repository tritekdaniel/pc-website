// Simple parallax: moves background at ~40% of scroll speed
(function(){
  const bg = document.querySelector('.bg-bg');
  if(!bg) return;
  // set background image from data-img attribute
  const img = bg.getAttribute('data-img');
  if(img){
    bg.style.backgroundImage = `url('${img}')`;
  }
  function update(){
    const y = window.scrollY * 0.4;
    bg.style.transform = `translateY(${y}px)`;
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
})();
