// Configuración de WhatsApp
// Formato: 521 + número a 10 dígitos
const NUMERO_WHATSAPP = "526141165102"; // Número de Chuy

// Base de Datos de Cupones de Descuento
const CUPONES = {
    "INSTADEUX": { tipo: "porcentaje", valor: 15, mensaje: "¡Cupón de Instagram aplicado! 15% de descuento." },
    "CHUY20": { tipo: "porcentaje", valor: 20, mensaje: "¡Cupón especial de Chuy aplicado! 20% de descuento." },
    "BOUTIQUE10": { tipo: "porcentaje", valor: 10, mensaje: "¡Cupón de bienvenida aplicado! 10% de descuento." }
};

// --- ESTADO GLOBAL DE LA APLICACIÓN --- //
let cart = JSON.parse(localStorage.getItem('mr_boutique_cart')) || [];
let appliedCoupon = JSON.parse(localStorage.getItem('mr_boutique_coupon')) || null;

// --- CONTROL DE HISTORIAL MÓVIL ---
// (El listener popstate se registra al final del archivo,
// después de que closeModalDirect y closeCartDirect estén definidas)
let isPopStateActive = false;

const pushStateIfNeeded = (hash) => {
    if (window.location.hash !== hash) {
        history.pushState({ activeView: hash }, '', hash);
    }
};

if (window.location.hash === '#detalle' || window.location.hash === '#carrito') {
    history.replaceState(null, '', window.location.pathname);
}

// --- ELEMENTOS DEL MODAL DE DETALLES --- //
const modal = document.getElementById('product-modal');
const modalMediaContainer = document.getElementById('modal-media-container');
const modalThumbnails = document.getElementById('modal-thumbnails');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalPromo = document.getElementById('modal-promo');
const modalDescription = document.getElementById('modal-description');
const modalOptionsWrapper = document.getElementById('modal-options-wrapper');
const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');
const modalBuyBtn = document.getElementById('modal-buy-btn');
const closeBtn = document.querySelector('.close-btn');

// Variables temporales para la selección actual en el modal
let currentProduct = {
    name: "",
    basePrice: 0,
    selectedOption: "",
    selectedPrice: 0,
    image: "",
    promo: ""
};

// --- ELEMENTOS DEL CARRITO (DRAWER) --- //
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const cartIconBtn = document.getElementById('cart-icon-btn');
const cartCloseBtn = document.getElementById('cart-close-btn');
const btnCloseCartGo = document.getElementById('btn-close-cart-go');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartBadge = document.getElementById('cart-badge');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartDiscount = document.getElementById('cart-discount');
const cartTotal = document.getElementById('cart-total');
const discountLine = document.getElementById('discount-line');
const discountPercent = document.getElementById('discount-percent');
const couponCodeInput = document.getElementById('coupon-code');
const applyCouponBtn = document.getElementById('apply-coupon-btn');
const couponMessage = document.getElementById('coupon-message');
const checkoutBtn = document.getElementById('checkout-btn');

// --- LÓGICA DE DETALLES DEL PRODUCTO --- //

// Abrir Modal al hacer click en la tarjeta de producto
const modalOptionChips = document.getElementById('modal-option-chips');

document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
        // Evitar abrir modal si se hace clic en botones directos si los hubiera
        if (e.target.closest('.btn-detail') || !e.target.closest('.modal-content')) {
            const name = card.getAttribute('data-name');
            const priceStr = card.getAttribute('data-price');
            const promo = card.getAttribute('data-promo') || "";
            const desc = card.getAttribute('data-desc') || "Sin descripción disponible.";
            const imagesStr = card.getAttribute('data-images') || "";
            const optionsStr = card.getAttribute('data-options') || "";
            
            const images = imagesStr ? imagesStr.split(',') : [];
            const primaryImage = images[0] || 'assets/placeholder.jpeg';

            // Configurar producto actual en modal
            currentProduct.name = name;
            currentProduct.image = primaryImage;
            currentProduct.promo = promo;

            // Rellenar datos estáticos del modal
            modalTitle.innerText = name;
            modalDescription.innerText = desc;
            
            if (promo) {
                modalPromo.innerText = promo;
                modalPromo.style.display = 'inline-block';
            } else {
                modalPromo.style.display = 'none';
            }

            // Procesar y renderizar opciones de compra como chips
            modalOptionChips.innerHTML = '';
            if (optionsStr) {
                const optionsArr = optionsStr.split(',').map(opt => {
                    const parts = opt.split(':');
                    return {
                        name: parts[0].trim(),
                        price: parseInt(parts[1].trim(), 10)
                    };
                });

                if (optionsArr.length > 1) {
                    modalOptionsWrapper.style.display = 'flex';

                    // Función para seleccionar un chip
                    const selectChip = (chip, opt) => {
                        modalOptionChips.querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'));
                        chip.classList.add('selected');
                        currentProduct.selectedOption = opt.name;
                        currentProduct.selectedPrice = opt.price;
                        modalPrice.innerText = `$${opt.price} MXN`;
                    };

                    optionsArr.forEach((opt, index) => {
                        const chip = document.createElement('button');
                        chip.className = 'option-chip' + (index === 0 ? ' selected' : '');
                        chip.innerText = `${opt.name} — $${opt.price}`;
                        chip.addEventListener('click', () => selectChip(chip, opt));
                        modalOptionChips.appendChild(chip);
                    });

                    // Seleccionar primera opción por defecto
                    currentProduct.selectedOption = optionsArr[0].name;
                    currentProduct.selectedPrice = optionsArr[0].price;
                    modalPrice.innerText = `$${optionsArr[0].price} MXN`;

                } else {
                    modalOptionsWrapper.style.display = 'none';
                    currentProduct.selectedOption = optionsArr[0].name;
                    currentProduct.selectedPrice = optionsArr[0].price;
                    modalPrice.innerText = `$${optionsArr[0].price} MXN`;
                }
            } else {
                modalOptionsWrapper.style.display = 'none';
                currentProduct.selectedOption = name;
                currentProduct.selectedPrice = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
                modalPrice.innerText = priceStr;
            }

            // Construir la galería autodeslizable (scroll-snap) del modal
            modalMediaContainer.innerHTML = '';
            modalThumbnails.innerHTML = '';

            images.forEach((imgUrl, index) => {
                const slide = document.createElement('div');
                slide.className = 'media-slide';
                slide.style.width = '100%';
                slide.style.height = '100%';
                slide.style.flex = '0 0 100%';
                slide.style.scrollSnapAlign = 'start';
                
                if (imgUrl.endsWith('.mp4')) {
                    const video = document.createElement('video');
                    video.src = imgUrl;
                    video.autoplay = index === 0;
                    video.loop = true;
                    video.muted = true;
                    video.controls = true;
                    video.playsInline = true;
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'contain';
                    slide.appendChild(video);
                } else {
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = name;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    slide.appendChild(img);
                }
                modalMediaContainer.appendChild(slide);

                if (images.length > 1) {
                    const thumb = document.createElement('div');
                    const isVideo = imgUrl.endsWith('.mp4');
                    thumb.className = `thumbnail ${index === 0 ? 'active' : ''} ${isVideo ? 'video-thumb' : ''}`;
                    
                    if (isVideo) {
                        thumb.innerHTML = `<video src="${imgUrl}" muted playsinline></video>`;
                    } else {
                        thumb.innerHTML = `<img src="${imgUrl}" alt="${name}">`;
                    }
                    
                    thumb.addEventListener('click', (thumbEvent) => {
                        thumbEvent.stopPropagation();
                        // Deslizar al slide correspondiente
                        const containerWidth = modalMediaContainer.clientWidth;
                        modalMediaContainer.scrollTo({
                            left: index * containerWidth,
                            behavior: 'smooth'
                        });
                        document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                        thumb.classList.add('active');
                    });
                    modalThumbnails.appendChild(thumb);
                }
            });

            if (images.length > 1) {
                modalThumbnails.style.display = 'flex';
                // Cambiar el thumbnail activo al deslizar
                modalMediaContainer.onscroll = () => {
                    const scrollLeft = modalMediaContainer.scrollLeft;
                    const containerWidth = modalMediaContainer.clientWidth;
                    if (containerWidth > 0) {
                        const activeIndex = Math.round(scrollLeft / containerWidth);
                        const thumbs = modalThumbnails.querySelectorAll('.thumbnail');
                        thumbs.forEach((t, i) => {
                            if (i === activeIndex) {
                                t.classList.add('active');
                            } else {
                                t.classList.remove('active');
                            }
                        });
                    }
                };
            } else {
                modalThumbnails.style.display = 'none';
                modalMediaContainer.onscroll = null;
            }

            // Mostrar el modal y resetear slide
            if (modalMediaContainer) {
                modalMediaContainer.scrollLeft = 0;
            }
            openModal();
        }
    });
});

// Funciones para abrir y cerrar el modal con soporte de historial y prevención de layout shift
const openModal = () => {
    modal.classList.add('active');
    
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.style.paddingRight = `calc(5% + ${scrollbarWidth}px)`;
    }
    
    document.body.style.overflow = 'hidden';
    pushStateIfNeeded('#detalle');
};

const closeModal = () => {
    if (modal && modal.classList.contains('active')) {
        if (window.location.hash === '#detalle') {
            history.back(); // Disparará popstate y ejecutará closeModalDirect()
        } else {
            closeModalDirect();
        }
    }
};

const closeModalDirect = () => {
    modal.classList.remove('active');
    
    if (!cartDrawer.classList.contains('active')) {
        document.body.style.overflow = 'auto';
        document.body.style.paddingRight = '0px';
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.style.paddingRight = '5%';
    }
};

if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });
}

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Comprar directamente la pieza configurada en el modal por WhatsApp
if (modalBuyBtn) {
    modalBuyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        let detalle = `*${currentProduct.name}*`;
        if (currentProduct.selectedOption && currentProduct.selectedOption !== currentProduct.name) {
            detalle += ` (Estilo/Tipo: ${currentProduct.selectedOption})`;
        }
        detalle += ` - Precio: *$${currentProduct.selectedPrice} MXN*`;
        if (currentProduct.promo) {
            detalle += ` [${currentProduct.promo}]`;
        }

        const mensaje = `Hola, vengo de la página web. 💎 Me interesa comprar la siguiente pieza: ${detalle}. ¿Tienen disponibilidad y envíos a mi código postal?`;
        const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
        closeModal();
    });
}


// --- LÓGICA DEL CARRITO DE COMPRAS --- //

// Calcular costo del artículo con soporte de promociones automáticas
const getCartItemTotal = (item) => {
    let promo = item.promo;
    if (promo === undefined) {
        const cardElem = document.querySelector(`.product-card[data-name="${item.name}"]`);
        promo = cardElem ? cardElem.getAttribute('data-promo') : '';
        item.promo = promo;
    }
    
    if (promo) {
        const match = promo.match(/(\d+)\s*x\s*\$(\d+)/i);
        if (match) {
            const promoQty = parseInt(match[1], 10);
            const promoPrice = parseInt(match[2], 10);
            
            if (item.quantity >= promoQty) {
                const promoSets = Math.floor(item.quantity / promoQty);
                const remainder = item.quantity % promoQty;
                return (promoSets * promoPrice) + (remainder * item.price);
            }
        }
    }
    return item.price * item.quantity;
};

// Abrir y cerrar el carrito
// Abrir y cerrar el carrito con soporte de historial y prevención de layout shift
const openCart = () => {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.style.paddingRight = `calc(5% + ${scrollbarWidth}px)`;
    }
    
    document.body.style.overflow = 'hidden';
    pushStateIfNeeded('#carrito');
};

const closeCart = () => {
    if (cartDrawer && cartDrawer.classList.contains('active')) {
        if (window.location.hash === '#carrito') {
            history.back(); // Disparará popstate y ejecutará closeCartDirect()
        } else {
            closeCartDirect();
        }
    }
};

const closeCartDirect = () => {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    
    if (!modal.classList.contains('active')) {
        document.body.style.overflow = 'auto';
        document.body.style.paddingRight = '0px';
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.style.paddingRight = '5%';
    }
};

if (cartIconBtn) cartIconBtn.addEventListener('click', openCart);
if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
if (btnCloseCartGo) btnCloseCartGo.addEventListener('click', closeCart);

// Agregar artículo al carrito desde el modal
if (modalAddToCartBtn) {
    modalAddToCartBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        const itemId = `${currentProduct.name}_${currentProduct.selectedOption}`.replace(/\s+/g, '_');
        
        // Buscar si el artículo ya está en el carrito
        const existingItem = cart.find(item => item.id === itemId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: itemId,
                name: currentProduct.name,
                option: currentProduct.selectedOption,
                price: currentProduct.selectedPrice,
                image: currentProduct.image,
                quantity: 1,
                promo: currentProduct.promo || ""
            });
        }

        saveCart();
        updateCartUI();
        // Cerrar modal directamente sin history.back
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            document.body.style.paddingRight = '0px';
            const nbEl = document.getElementById('navbar');
            if (nbEl) nbEl.style.removeProperty('padding-right');
            // Limpiar hash si quedó
            if (window.location.hash === '#detalle') {
                history.replaceState(null, '', window.location.pathname);
            }
        }
        // Mostrar mensaje premium tipo Toast
        showToast(`${currentProduct.name} agregado al carrito`);

        // Si el navbar está oculto, lo asoma brevemente para avisar del carrito
        if (navHidden) {
            const peekNav = document.getElementById('navbar');
            if (peekNav) {
                peekNav.classList.remove('cart-peek');
                void peekNav.offsetWidth; // forzar reflow para reiniciar animación
                peekNav.classList.add('cart-peek');
                setTimeout(() => {
                    peekNav.classList.remove('cart-peek');
                    // Restaurar estado correcto según navHidden
                    if (navHidden) peekNav.style.transform = 'translateY(-100%)';
                }, 1700);
            }
        }
    });
}

// Guardar carrito en localStorage
const saveCart = () => {
    localStorage.setItem('mr_boutique_cart', JSON.stringify(cart));
};

// Eliminar del carrito
const deleteCartItem = (itemId) => {
    cart = cart.filter(item => item.id !== itemId);
    saveCart();
    updateCartUI();
};

// Cambiar cantidad
const updateCartItemQty = (itemId, change) => {
    const item = cart.find(item => item.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            deleteCartItem(itemId);
            return;
        }
        saveCart();
        updateCartUI();
    }
};

// Aplicar Cupón
const applyDiscountCoupon = () => {
    const code = couponCodeInput.value.trim().toUpperCase();
    if (!code) {
        showCouponMessage("Por favor ingresa un código.", "error");
        return;
    }

    if (CUPONES[code]) {
        appliedCoupon = {
            code: code,
            value: CUPONES[code].valor,
            message: CUPONES[code].mensaje
        };
        localStorage.setItem('mr_boutique_coupon', JSON.stringify(appliedCoupon));
        showCouponMessage(appliedCoupon.message, "success");
        updateCartUI();
    } else {
        showCouponMessage("Cupón inválido o expirado.", "error");
    }
};

const showCouponMessage = (msg, type) => {
    couponMessage.innerText = msg;
    couponMessage.className = `coupon-message ${type}`;
};

if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', applyDiscountCoupon);
}

// Renderizar el carrito en interfaz
const updateCartUI = () => {
    cartItemsContainer.innerHTML = '';
    
    // Contar total de artículos
    const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartBadge.innerText = totalItemsCount;
    cartBadge.style.display = totalItemsCount > 0 ? 'flex' : 'none';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty-message">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Tu carrito está vacío</p>
                <button class="btn-primary" onclick="closeCart()">Explorar Catálogo</button>
            </div>
        `;
        cartSubtotal.innerText = '$0 MXN';
        cartTotal.innerText = '$0 MXN';
        discountLine.style.display = 'none';
        checkoutBtn.style.display = 'none';
        return;
    }

    checkoutBtn.style.display = 'block';

    // Renderizar cada artículo
    cart.forEach(item => {
        const itemElem = document.createElement('div');
        itemElem.className = 'cart-item';
        
        // Comprobar si la opción es igual al nombre para no repetir
        const optionDisplay = (item.option && item.option !== item.name) 
            ? `<span class="cart-item-option">Estilo: ${item.option}</span>` 
            : '';

        const itemCost = getCartItemTotal(item);
        const hasPromoActive = itemCost < (item.price * item.quantity);
        let priceDisplay = `<span class="cart-item-price">$${itemCost} MXN</span>`;
        if (hasPromoActive) {
            priceDisplay = `
                <div class="cart-item-price-wrapper">
                    <span class="cart-item-price">$${itemCost} MXN</span>
                    <span class="cart-item-old-price">$${item.price * item.quantity} MXN</span>
                    <span class="cart-item-promo-badge">¡Promo aplicada!</span>
                </div>
            `;
        }

        itemElem.innerHTML = `
            <div class="cart-item-img">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                ${optionDisplay}
                ${priceDisplay}
                <div class="cart-item-qty-container">
                    <button class="qty-btn" onclick="updateCartItemQty('${item.id}', -1)">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartItemQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <button class="cart-item-delete" onclick="deleteCartItem('${item.id}')">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        `;
        cartItemsContainer.appendChild(itemElem);
    });

    // Calcular Subtotal
    const subtotal = cart.reduce((acc, item) => acc + getCartItemTotal(item), 0);
    cartSubtotal.innerText = `$${subtotal} MXN`;

    // Aplicar descuento de cupón
    if (appliedCoupon) {
        const discountAmount = Math.round(subtotal * (appliedCoupon.value / 100));
        const finalTotal = subtotal - discountAmount;

        discountPercent.innerText = `${appliedCoupon.value}%`;
        cartDiscount.innerText = `-$${discountAmount} MXN`;
        discountLine.style.display = 'flex';
        cartTotal.innerText = `$${finalTotal} MXN`;
        
        // Auto-fill input text with active code
        couponCodeInput.value = appliedCoupon.code;
        showCouponMessage(appliedCoupon.message, "success");
    } else {
        discountLine.style.display = 'none';
        cartTotal.innerText = `$${subtotal} MXN`;
    }
};

// Confirmar pedido total por WhatsApp
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return;

        let resSubtotal = cart.reduce((acc, item) => acc + getCartItemTotal(item), 0);
        let resTotal = resSubtotal;

        let listado = "";
        cart.forEach((item, index) => {
            let optStr = (item.option && item.option !== item.name) ? ` (${item.option})` : '';
            const itemCost = getCartItemTotal(item);
            const promoAppliedStr = (itemCost < item.price * item.quantity) ? ' (¡Promo aplicada!)' : '';
            listado += `${index + 1}. *${item.name}${optStr}* [x${item.quantity}] - $${itemCost} MXN ${promoAppliedStr}\n`;
        });

        let mensaje = `Hola, vengo de la página web. 💎 Quisiera confirmar mi pedido:\n\n${listado}\n`;
        
        if (appliedCoupon) {
            const discountAmount = Math.round(resSubtotal * (appliedCoupon.value / 100));
            resTotal = resSubtotal - discountAmount;
            mensaje += `Cupón Aplicado: *${appliedCoupon.code}* (${appliedCoupon.value}% desc.)\n`;
            mensaje += `Descuento: -$${discountAmount} MXN\n`;
        }

        mensaje += `*Total a pagar: $${resTotal} MXN*\n\n¿Me pueden confirmar disponibilidad y costo de envío a mi código postal?`;
        
        const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensaje)}`;
        
        // Vaciar carrito después de enviar orden (opcional)
        // cart = [];
        // saveCart();
        // localStorage.removeItem('mr_boutique_coupon');
        // appliedCoupon = null;
        // updateCartUI();

        window.open(url, '_blank');
        closeCart();
    });
}

// Exponer funciones necesarias al scope global para listeners inline
window.updateCartItemQty = updateCartItemQty;
window.deleteCartItem = deleteCartItem;
window.closeCart = closeCart;

// --- FUNCIONES VISUALES (FRONTEND) --- //

// Mostrar mensaje flotante tipo Toast
const showToast = (message) => {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification glass-panel';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-gold); margin-right: 8px;"></i> ${message}`;
    
    // Al dar clic en el toast se abre el carrito y se remueve el toast
    toast.addEventListener('click', () => {
        openCart();
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    });

    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remover después de 3.5 segundos si no se ha removido ya por click
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }
    }, 3500);
};

// Botón de Envíanos un WhatsApp en pie/banner (Duda general)
const btnContacto = document.querySelector('.btn-whatsapp');
if (btnContacto) {
    btnContacto.addEventListener('click', (e) => {
        if (!e.target.closest('.pulse')) {
            e.preventDefault();
            const mensaje = `Hola, vengo de la página web. 💎 Quiero hacerles una consulta o pedir informes de joyería...`;
            const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        }
    });
}

// Formulario/Botones de banner localización
const bannerBtnWhats = document.querySelector('.banner-content .btn-whatsapp');
if (bannerBtnWhats) {
    bannerBtnWhats.addEventListener('click', (e) => {
        e.preventDefault();
        const mensaje = `Hola, vengo de la página web. 💎 Estoy interesado en info de mayoreo o cotizaciones desde Jiménez.`;
        const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    });
}

// Navbar smart scroll: ocultar al bajar, mostrar al subir
const navbarObj = document.getElementById('navbar');
let lastScrollY = window.scrollY;
let navHidden = false;

window.addEventListener('scroll', () => {
    const currentY = window.scrollY;

    // Cambio visual 'scrolled'
    if (currentY > 50) {
        navbarObj.classList.add('scrolled');
    } else {
        navbarObj.classList.remove('scrolled');
    }

    // Ocultar al bajar, mostrar al subir
    if (currentY > lastScrollY && currentY > 120) {
        // Bajando
        if (!navHidden) {
            navbarObj.style.transform = 'translateY(-100%)';
            navHidden = true;
        }
    } else {
        // Subiendo
        if (navHidden) {
            navbarObj.style.transform = 'translateY(0)';
            navHidden = false;
        }
    }

    lastScrollY = currentY;
});

// Hamburger Mobile Menu toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger) {
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinks.classList.toggle('active');
        const icon = hamburger.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    });
}

// Smooth scrolling de anclas
document.querySelectorAll('.nav-links a, .btn-primary').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            navLinks.classList.remove('active');

            const icon = hamburger ? hamburger.querySelector('i') : null;
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }

            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }
    });
});

// Intersection Observer animaciones CSS (reveal)
const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
};

const observerInstance = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal').forEach((element) => {
    observerInstance.observe(element);
});

// FAQ Accordion logic
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const answer = button.nextElementSibling;
        
        document.querySelectorAll('.faq-answer').forEach(item => {
            if (item !== answer) {
                item.style.maxHeight = null;
                item.previousElementSibling.classList.remove('active');
            }
        });

        button.classList.toggle('active');
        if (button.classList.contains('active')) {
            answer.style.maxHeight = answer.scrollHeight + "px";
        } else {
            answer.style.maxHeight = null;
        }
    });
});

// --- LÓGICA DE FILTRADO DEL CATÁLOGO --- //
const filterButtons = document.querySelectorAll('.filter-btn');
const productCards = document.querySelectorAll('.product-card');

function filterProducts(categoryKey) {
    filterButtons.forEach(btn => {
        if (btn.getAttribute('data-filter') === categoryKey) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    productCards.forEach(card => {
        const categoriesStr = card.getAttribute('data-category') || '';
        const categories = categoriesStr.split(',').map(s => s.trim());
        
        if (categoryKey === 'all' || categories.includes(categoryKey)) {
            card.classList.remove('hidden');
            card.classList.remove('fade-in-filter');
            // Forzar reflow para reiniciar la animación
            void card.offsetWidth;
            card.classList.add('fade-in-filter');
        } else {
            card.classList.add('hidden');
            card.classList.remove('fade-in-filter');
        }
    });
}

// Event Listeners para los botones de filtros
filterButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const filterVal = this.getAttribute('data-filter');
        filterProducts(filterVal);
    });
});

// Event Listeners para las tarjetas de "Nuestra Promesa" (Calidad)
document.querySelectorAll('.quality-clickable').forEach(card => {
    card.addEventListener('click', function() {
        const targetFilter = this.getAttribute('data-filter-target');
        if (targetFilter) {
            filterProducts(targetFilter);
            const catalogSection = document.getElementById('coleccion');
            if (catalogSection) {
                catalogSection.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }
    });
});

// -- Inicializar Carrito al Cargar Página -- //
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
});

// --- POPSTATE: Cerrar modal/carrito con botón atrás del celular ---
// Se registra aquí al final para que closeModalDirect y closeCartDirect ya estén definidas
window.addEventListener('popstate', () => {
    isPopStateActive = true;
    if (window.location.hash !== '#detalle' && modal && modal.classList.contains('active')) {
        closeModalDirect();
    }
    if (window.location.hash !== '#carrito' && cartDrawer && cartDrawer.classList.contains('active')) {
        closeCartDirect();
    }
    isPopStateActive = false;
});
