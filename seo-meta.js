(function(){
const SITE='https://utty1985-beep.github.io/Unamano/';
const TITLE='UnaMano — Chiedi una mano. Dai una mano.';
const DESC='UnaMano è una bacheca locale italiana per chiedere aiuto, candidarsi ad attività occasionali, lavori stagionali e costruire reputazione tramite recensioni.';
const SOCIAL=SITE+'social-card.svg';
function meta(name,content,property=false){let el=document.head.querySelector(`meta[${property?'property':'name'}="${name}"]`);if(!el){el=document.createElement('meta');el.setAttribute(property?'property':'name',name);document.head.appendChild(el)}el.setAttribute('content',content)}
function link(rel,href,hreflang){let el=document.head.querySelector(`link[rel="${rel}"]${hreflang?`[hreflang="${hreflang}"]`:''}`);if(!el){el=document.createElement('link');el.rel=rel;if(hreflang)el.hreflang=hreflang;document.head.appendChild(el)}el.href=href}
function install(){
 document.title=TITLE;
 meta('description',DESC);
 meta('robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
 meta('googlebot','index,follow');meta('bingbot','index,follow');
 meta('keywords','aiuto locale, piccoli lavori, lavori occasionali, lavori stagionali, campagna, babysitter, giardinaggio, spesa, pulizie, commissioni, Foggia, Italia');
 meta('og:type','website',true);meta('og:site_name','UnaMano',true);meta('og:title',TITLE,true);meta('og:description',DESC,true);meta('og:url',SITE,true);meta('og:locale','it_IT',true);
 meta('og:image',SOCIAL,true);meta('og:image:type','image/svg+xml',true);meta('og:image:width','1200',true);meta('og:image:height','630',true);meta('og:image:alt','UnaMano — Chiedi una mano. Dai una mano.',true);
 meta('twitter:card','summary_large_image');meta('twitter:title',TITLE);meta('twitter:description',DESC);meta('twitter:image',SOCIAL);meta('twitter:image:alt','UnaMano — Chiedi una mano. Dai una mano.');
 link('canonical',SITE);link('alternate',SITE,'it-IT');
 if(!document.getElementById('umSeoJsonLd')){const s=document.createElement('script');s.type='application/ld+json';s.id='umSeoJsonLd';s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebApplication','name':'UnaMano','url':SITE,'description':DESC,'applicationCategory':'SocialNetworkingApplication','operatingSystem':'Any','inLanguage':'it-IT','areaServed':{'@type':'Country','name':'Italia'},'offers':{'@type':'Offer','price':'0','priceCurrency':'EUR'}});document.head.appendChild(s)}
}
install();
})();
