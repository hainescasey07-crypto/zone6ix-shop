(() => {
  "use strict";

  const STORAGE_KEY = "zone6ixLanguage";
  const supported = new Set(["en", "es"]);
  let currentLanguage = supported.has(localStorage.getItem(STORAGE_KEY))
    ? localStorage.getItem(STORAGE_KEY)
    : "en";

  const es = {
    "Zone6ix Customs": "Zone6ix Customs",
    "Collections": "Colecciones",
    "Turfs": "Territorios",
    "Weapons": "Armas",
    "Identity": "Identidad",
    "Process": "Proceso",
    "Sign in": "Iniciar sesión",
    "Google account": "Cuenta de Google",
    "Not signed in": "Sesión no iniciada",
    "Sign in to save orders": "Inicia sesión para guardar pedidos",
    "My orders": "Mis pedidos",
    "Sign out": "Cerrar sesión",
    "Basket": "Cesta",
    "CUSTOM ORDERS OPEN": "PEDIDOS PERSONALIZADOS ABIERTOS",
    "YOUR GANG.": "TU BANDA.",
    "YOUR WORLD.": "TU MUNDO.",
    "BUILT DIFFERENT.": "HECHO DIFERENTE.",
    "Premium custom turfs, exclusive weapons and full gang identity systems designed for the Zone6ix experience.": "Territorios personalizados premium, armas exclusivas y sistemas completos de identidad de banda diseñados para la experiencia Zone6ix.",
    "Explore the studio": "Explorar el estudio",
    "Build an order": "Crear un pedido",
    "custom products": "productos personalizados",
    "payment options": "opciones de pago",
    "gang-specific design": "diseño exclusivo para tu banda",
    "Z6 DESIGN SYSTEM": "SISTEMA DE DISEÑO Z6",
    "LIVE PREVIEW": "VISTA PREVIA EN DIRECTO",
    "CUSTOM TURF": "TERRITORIO PERSONALIZADO",
    "GANG IDENTITY": "IDENTIDAD DE BANDA",
    "EXCLUSIVE LOADOUT": "EQUIPAMIENTO EXCLUSIVO",
    "FEATURED BUILD": "DISEÑO DESTACADO",
    "Medium Turf System": "Sistema de territorio mediano",
    "Custom Turfs": "Territorios personalizados",
    "Exclusive Weapons": "Armas exclusivas",
    "Gang Identity": "Identidad de banda",
    "Secure Stripe Checkout": "Pago seguro con Stripe",
    "Robux Payment": "Pago con Robux",
    "Built for Zone6ix": "Creado para Zone6ix",
    "THE STUDIO": "EL ESTUDIO",
    "More than a shop.": "Más que una tienda.",
    "Your gang’s design department.": "El departamento de diseño de tu banda.",
    "Choose a foundation, add the details, then send your references. Every order is built around your gang instead of copied from a generic preset.": "Elige una base, añade los detalles y envía tus referencias. Cada pedido se crea alrededor de tu banda, no a partir de una plantilla genérica.",
    "ENVIRONMENTS": "ENTORNOS",
    "From a compact base to a full gang headquarters.": "Desde una base compacta hasta una sede completa para la banda.",
    "LOADOUTS": "EQUIPAMIENTOS",
    "Gang Weapons": "Armas de banda",
    "Ready-made gold finishes or a completely custom build.": "Acabados dorados listos o un diseño totalmente personalizado.",
    "BRANDING": "MARCA",
    "Name, icon and level styling that makes your gang recognisable.": "Nombre, icono y nivel para que tu banda sea reconocible.",
    "CUSTOM TURFS": "TERRITORIOS PERSONALIZADOS",
    "Build a place your gang can own.": "Crea un lugar que tu banda pueda dominar.",
    "Pick the scale first. The logo, colours, rooms, layout and references are supplied during checkout.": "Elige primero el tamaño. El logo, los colores, las salas, la distribución y las referencias se envían durante el pedido.",
    "FEATURED CONFIGURATION": "CONFIGURACIÓN DESTACADA",
    "The full gang headquarters.": "La sede completa de la banda.",
    "Large turf, second floor, custom weapon and complete identity package — designed as one consistent gang system.": "Territorio grande, segunda planta, arma personalizada y paquete completo de identidad, diseñados como un único sistema para tu banda.",
    "Build the full setup": "Crear el paquete completo",
    "TURF": "TERRITORIO",
    "Large headquarters": "Sede grande",
    "LOADOUT": "EQUIPAMIENTO",
    "Fully custom weapon": "Arma totalmente personalizada",
    "IDENTITY": "IDENTIDAD",
    "Name, icon and level": "Nombre, icono y nivel",
    "WEAPON LAB": "LABORATORIO DE ARMAS",
    "Make the loadout part of the brand.": "Haz que el equipamiento forme parte de la marca.",
    "Choose a ready-made metallic finish or commission a weapon built around your colours, logo and 3D writing.": "Elige un acabado metálico ya preparado o encarga un arma creada con tus colores, logo y texto 3D.",
    "CUSTOM TEXTURE": "TEXTURA PERSONALIZADA",
    "Colour + material direction": "Dirección de color y material",
    "3D GANG TEXT": "TEXTO 3D DE LA BANDA",
    "Name applied to the model": "Nombre aplicado al modelo",
    "LOGO DETAIL": "DETALLE DEL LOGO",
    "Gang mark integration": "Integración de la marca de la banda",
    "IDENTITY SYSTEM": "SISTEMA DE IDENTIDAD",
    "Recognition before they even read the name.": "Reconocible antes de que lean el nombre.",
    "CREW IDENTIFIER": "IDENTIFICADOR DE BANDA",
    "LEVEL 100": "NIVEL 100",
    "HOW IT WORKS": "CÓMO FUNCIONA",
    "From idea to in-game.": "De la idea al juego.",
    "A simple order flow with enough detail for your build to come out how you pictured it.": "Un proceso sencillo con el detalle necesario para que el resultado sea como lo imaginaste.",
    "Choose the build": "Elige el diseño",
    "Add every product needed for your gang setup.": "Añade todos los productos necesarios para tu banda.",
    "Send the direction": "Envía las indicaciones",
    "Describe the layout, styling and reference material.": "Describe la distribución, el estilo y las referencias.",
    "Complete payment": "Completa el pago",
    "Use secure Stripe Checkout or purchase with Robux.": "Usa el pago seguro de Stripe o compra con Robux.",
    "Track the build": "Sigue el progreso",
    "Sign in to see progress, updates and every past order in one place.": "Inicia sesión para ver el progreso, las novedades y todos tus pedidos anteriores en un solo lugar.",
    "START THE ORDER": "INICIAR EL PEDIDO",
    "Turn the idea into a real Zone6ix build.": "Convierte la idea en una creación real de Zone6ix.",
    "Your basket controls the products. This form tells us who the order belongs to and exactly what should be created.": "La cesta contiene los productos. Este formulario nos indica a quién pertenece el pedido y qué debemos crear exactamente.",
    "Protected checkout": "Pago protegido",
    "Card details stay with Stripe.": "Los datos de la tarjeta permanecen en Stripe.",
    "Basket saved locally": "Cesta guardada en el dispositivo",
    "Your selections remain on this device.": "Tus selecciones permanecen en este dispositivo.",
    "Built to your references": "Creado según tus referencias",
    "Links and detailed requests are supported.": "Puedes enviar enlaces e indicaciones detalladas.",
    "ORDER CONFIGURATION": "CONFIGURACIÓN DEL PEDIDO",
    "Your details": "Tus datos",
    "SECURE": "SEGURO",
    "Roblox username": "Usuario de Roblox",
    "Gang name": "Nombre de la banda",
    "Email address": "Correo electrónico",
    "Discord username": "Usuario de Discord",
    "Payment method": "Método de pago",
    "Card payment — Stripe": "Pago con tarjeta — Stripe",
    "Robux payment — Zone6ix": "Pago con Robux — Zone6ix",
    "Describe the build": "Describe el diseño",
    "Reference image link": "Enlace de imagen de referencia",
    "optional": "opcional",
    "Google sign-in required": "Debes iniciar sesión con Google",
    "Your order and progress will be saved to your account.": "Tu pedido y su progreso se guardarán en tu cuenta.",
    "Review my order": "Revisar mi pedido",
    "You will review every detail before leaving for Stripe or Roblox.": "Revisarás todos los detalles antes de ir a Stripe o Roblox.",
    "INFORMATION": "INFORMACIÓN",
    "Before you place it.": "Antes de realizarlo.",
    "How long does an order take?": "¿Cuánto tarda un pedido?",
    "Time depends on the size and detail of the request. You will be contacted after ordering with the next step.": "El tiempo depende del tamaño y del detalle del pedido. Te contactaremos después para indicarte el siguiente paso.",
    "Can I send a completely original idea?": "¿Puedo enviar una idea totalmente original?",
    "Yes. Use the request box and reference link. Complicated ideas may need discussion before the work begins.": "Sí. Usa el cuadro de solicitud y el enlace de referencia. Las ideas complejas pueden requerir una conversación antes de empezar.",
    "How does Robux checkout work?": "¿Cómo funciona el pago con Robux?",
    "The website opens Zone6ix and sends the purchase prompts for the products currently in your basket.": "La web abre Zone6ix y muestra las compras de los productos que tienes en la cesta.",
    "Are card details stored on this website?": "¿Se guardan los datos de la tarjeta en esta web?",
    "No. Card payment is completed on Stripe Checkout rather than inside this page.": "No. El pago con tarjeta se completa en Stripe Checkout, no dentro de esta página.",
    "Premium custom content for the Zone6ix Roblox experience.": "Contenido personalizado premium para la experiencia Zone6ix de Roblox.",
    "Order": "Pedido",
    "Custom orders open": "Pedidos personalizados abiertos",
    "items selected": "artículos seleccionados",
    "View basket": "Ver cesta",
    "YOUR CONFIGURATION": "TU CONFIGURACIÓN",
    "Your build is empty.": "Tu pedido está vacío.",
    "Add a turf, weapon or identity upgrade to begin.": "Añade un territorio, un arma o una mejora de identidad para empezar.",
    "Card total": "Total con tarjeta",
    "Robux total": "Total en Robux",
    "Continue to order": "Continuar al pedido",
    "FINAL CHECK": "REVISIÓN FINAL",
    "Review the build.": "Revisa el diseño.",
    "Confirm every detail before continuing to your selected payment method.": "Confirma todos los detalles antes de continuar con el método de pago elegido.",
    "Pay securely with Stripe": "Pagar de forma segura con Stripe",
    "Card payments open Stripe. Robux payments open Zone6ix.": "Los pagos con tarjeta abren Stripe. Los pagos con Robux abren Zone6ix.",
    "ZONE6IX ACCOUNT": "CUENTA ZONE6IX",
    "Refresh": "Actualizar",
    "Zone6ix customer": "Cliente de Zone6ix",
    "Saved Roblox username": "Usuario de Roblox guardado",
    "Saved Discord username": "Usuario de Discord guardado",
    "Saved gang name": "Nombre de banda guardado",
    "Save my details": "Guardar mis datos",
    "Loading your orders…": "Cargando tus pedidos…",
    "Close My Orders": "Cerrar Mis pedidos",
    "Shopping basket": "Cesta de compra",
    "Close basket": "Cerrar cesta",
    "Review your order": "Revisar tu pedido",
    "Close review": "Cerrar revisión",
    "Owner account": "Cuenta del propietario",
    "Admin account": "Cuenta de administrador",
    "My Zone6ix": "Mi Zone6ix",
    "Signed in as": "Sesión iniciada como",
    "This order and every update will be saved to My Orders.": "Este pedido y todas sus novedades se guardarán en Mis pedidos.",
    "Unknown date": "Fecha desconocida",
    "Unknown": "Desconocido",
    "Awaiting payment": "Pendiente de pago",
    "Paid": "Pagado",
    "Reviewing": "En revisión",
    "In progress": "En curso",
    "Ready": "Listo",
    "Completed": "Completado",
    "Cancelled": "Cancelado",
    "Unpaid": "No pagado",
    "Pending": "Pendiente",
    "Failed": "Fallido",
    "Refunded": "Reembolsado",
    "Robux pending": "Robux pendiente",
    "Robux verified": "Robux verificado",
    "All orders": "Todos los pedidos",
    "Active builds": "Diseños activos",
    "Payments confirmed": "Pagos confirmados",
    "No saved orders yet.": "Todavía no hay pedidos guardados.",
    "Your next Stripe or Robux order will appear here automatically.": "Tu próximo pedido con Stripe o Robux aparecerá aquí automáticamente.",
    "No new update has been added yet.": "Todavía no se ha añadido ninguna novedad.",
    "Order code": "Código del pedido",
    "Products": "Productos",
    "Latest update": "Última novedad",
    "No items found": "No se encontraron artículos",
    "Could not load your orders.": "No se pudieron cargar tus pedidos.",
    "Saving…": "Guardando…",
    "Saved. These details will fill your next order.": "Guardado. Estos datos se usarán en tu próximo pedido.",
    "Sign in with Google first.": "Primero inicia sesión con Google.",
    "Google sign-in failed": "Error al iniciar sesión con Google",
    "Sign in with Google to continue.": "Inicia sesión con Google para continuar.",
    "Google sign-in is required to save this order.": "Debes iniciar sesión con Google para guardar este pedido.",
    "Add at least one item to your basket first.": "Añade al menos un artículo a la cesta primero.",
    "Your basket is empty. Add at least one product first.": "Tu cesta está vacía. Añade al menos un producto primero.",
    "Please review your order again.": "Vuelve a revisar tu pedido.",
    "One or more products are missing their Roblox Product ID.": "Falta el ID de producto de Roblox en uno o más productos.",
    "Stripe could not create the checkout.": "Stripe no pudo crear el pago.",
    "The Robux order could not be saved.": "No se pudo guardar el pedido con Robux.",
    "Stripe has not confirmed this payment.": "Stripe todavía no ha confirmado este pago.",
    "Stripe has not confirmed the payment yet. Do not pay again immediately. Contact Zone6ix if money was taken.": "Stripe todavía no ha confirmado el pago. No vuelvas a pagar inmediatamente. Contacta con Zone6ix si se ha cobrado el dinero.",
    "Payment was cancelled. Your items are still in the basket.": "El pago se canceló. Tus artículos siguen en la cesta.",
    "Add to basket": "Añadir a la cesta",
    "Added to basket": "Añadido a la cesta",
    "Remove": "Eliminar",
    "or": "o",
    "Email": "Correo electrónico",
    "Discord": "Discord",
    "Checkout error": "Error de pago",
    "Card price": "Precio con tarjeta",
    "Robux price": "Precio en Robux",
    "STARTER BUILD": "DISEÑO INICIAL",
    "MOST POPULAR": "MÁS POPULAR",
    "HEADQUARTERS": "SEDE PRINCIPAL",
    "TURF ADD-ON": "AMPLIACIÓN DE TERRITORIO",
    "METALLIC SERIES": "SERIE METÁLICA",
    "FULL COMMISSION": "ENCARGO COMPLETO",
    "NAME SYSTEM": "SISTEMA DE NOMBRE",
    "ICON SYSTEM": "SISTEMA DE ICONO",
    "LEVEL SYSTEM": "SISTEMA DE NIVEL",
    "BEST VALUE": "MEJOR PRECIO",
    "Small Turf": "Territorio pequeño",
    "Medium Turf": "Territorio mediano",
    "Large Turf": "Territorio grande",
    "Second Floor": "Segunda planta",
    "Gold Uzi": "Uzi dorada",
    "Gold Draco": "Draco dorado",
    "Fully Custom Gun": "Arma totalmente personalizada",
    "Custom Name": "Nombre personalizado",
    "Custom Icon": "Icono personalizado",
    "Custom Level": "Nivel personalizado",
    "Identity Bundle": "Paquete de identidad",
    "A compact gang base with custom branding, a clean interior and enough space for a focused crew setup.": "Una base compacta con marca personalizada, interior limpio y espacio suficiente para una banda bien organizada.",
    "A larger gang environment with more usable rooms, stronger street presence and extra custom detailing.": "Un entorno más grande con más salas útiles, mayor presencia en la calle y detalles personalizados adicionales.",
    "A full gang headquarters with multiple spaces, detailed branding and the strongest visual presence.": "Una sede completa con varios espacios, marca detallada y la mayor presencia visual.",
    "Expand an existing turf with another level for extra rooms, storage, meetings or private gang areas.": "Amplía un territorio existente con otra planta para salas, almacenamiento, reuniones o zonas privadas.",
    "A ready-made metallic Uzi finish reserved for your gang and delivered as a premium exclusive loadout.": "Un acabado metálico para la Uzi reservado para tu banda como equipamiento premium exclusivo.",
    "A premium metallic Draco with a stronger silhouette and a high-value gang weapon appearance.": "Una Draco metálica premium con una silueta más fuerte y aspecto de arma de alto valor.",
    "Choose the weapon direction, material, gang logo, colour treatment and custom 3D writing.": "Elige el tipo de arma, material, logo de la banda, tratamiento de color y texto 3D personalizado.",
    "Give your gang a unique in-game name treatment created specifically for your group.": "Da a tu banda un nombre único dentro del juego creado específicamente para tu grupo.",
    "Add a recognisable custom symbol beside your gang identity without relying on a default emoji.": "Añade un símbolo personalizado reconocible a la identidad de tu banda sin depender de un emoji predeterminado.",
    "Choose a custom level display that adds status and a stronger profile to every gang member.": "Elige un nivel personalizado que aporte estatus y una presencia más fuerte a cada miembro.",
    "The complete gang name, custom icon and custom level system together at a lower bundle price.": "El sistema completo de nombre, icono y nivel personalizado a un precio de paquete más bajo.",
    "Roblox username": "Usuario de Roblox",
    "Your Roblox username": "Tu usuario de Roblox",
    "Your gang name": "Nombre de tu banda",
    "Filled from your Google account": "Completado desde tu cuenta de Google",
    "Tell us the colours, layout, weapon texture, writing, icon, level or any other detail...": "Cuéntanos los colores, distribución, textura del arma, texto, icono, nivel o cualquier otro detalle...",
    "Discord, Imgur or another image link": "Enlace de Discord, Imgur u otra imagen",
    "Send Robux order request": "Enviar pedido con Robux",
    "Saving order and opening Stripe...": "Guardando el pedido y abriendo Stripe...",
    "Saving Robux order...": "Guardando el pedido con Robux...",
    "Opening Zone6ix...": "Abriendo Zone6ix...",
    "Payment choice": "Forma de pago",
    "Total": "Total",
    "Request": "Solicitud",
    "Reference link": "Enlace de referencia",
    "None provided": "No proporcionado",
    "Card / cash": "Tarjeta",
    "Order request sent.": "Solicitud de pedido enviada.",
    "Event Store": "Tienda de eventos",
    "Zone Token wallet": "Cartera de Zone Tokens",
    "LIVE DROPS": "LANZAMIENTOS ACTIVOS",
    "THE ZONE6IX": "ZONE6IX",
    "EVENT STORE.": "TIENDA DE EVENTOS.",
    "Stay active, earn Zone Tokens and unlock limited items released directly by the Zone6ix team.": "Mantente activo, gana Zone Tokens y desbloquea artículos limitados publicados directamente por el equipo de Zone6ix.",
    "YOUR BALANCE": "TU SALDO",
    "Sign in to earn": "Inicia sesión para ganar",
    "Open wallet": "Abrir cartera",
    "ACTIVE TIME": "TIEMPO ACTIVO",
    "DAILY REWARD": "RECOMPENSA DIARIA",
    "PURCHASE BONUS": "BONO DE COMPRA",
    "SECURE WALLET": "CARTERA SEGURA",
    "Saved to your Google account": "Guardado en tu cuenta de Google",
    "Loading live drops…": "Cargando lanzamientos activos…",
    "No live drops right now.": "No hay lanzamientos activos ahora.",
    "Check back for limited Zone6ix releases created from the admin dashboard.": "Vuelve para ver lanzamientos limitados de Zone6ix creados desde el panel de administración.",
    "LIMITED": "LIMITADO",
    "Sold out": "Agotado",
    "Unlimited availability": "Disponibilidad ilimitada",
    "remaining": "restantes",
    "No expiry": "Sin caducidad",
    "Ended": "Finalizado",
    "left": "restantes",
    "Redeem": "Canjear",
    "Sign in to redeem": "Inicia sesión para canjear",
    "ZONE6IX REWARDS": "RECOMPENSAS ZONE6IX",
    "AVAILABLE BALANCE": "SALDO DISPONIBLE",
    "earned": "ganados",
    "spent": "gastados",
    "ACTIVE EARNING": "GANANCIA ACTIVA",
    "Waiting for sign-in": "Esperando inicio de sesión",
    "Earning paused by admin": "Ganancia pausada por el administrador",
    "Earning now": "Ganando ahora",
    "Paused — use the site to continue": "Pausado — usa el sitio para continuar",
    "active minutes today": "minutos activos hoy",
    "Daily limit": "Límite diario",
    "Token activity": "Actividad de tokens",
    "My redemptions": "Mis canjes",
    "How to earn": "Cómo ganar",
    "Loading token activity…": "Cargando actividad de tokens…",
    "Stay genuinely active": "Mantente realmente activo",
    "Tokens count while this tab is visible and you are using the site. Leaving it idle pauses earning.": "Los tokens cuentan mientras esta pestaña está visible y usas el sitio. Si queda inactiva, la ganancia se pausa.",
    "Return each day": "Vuelve cada día",
    "Your daily login bonus is added once per day when you open your wallet.": "Tu bono diario se añade una vez al día al abrir la cartera.",
    "Complete purchases": "Completa compras",
    "Paid Stripe orders and verified Robux orders receive the configured purchase bonus.": "Los pedidos pagados con Stripe y los pedidos de Robux verificados reciben el bono de compra configurado.",
    "Redeem limited drops": "Canjea lanzamientos limitados",
    "Spend tokens in the Event Store. Redemptions are saved to this account and tracked by the admin.": "Gasta tokens en la Tienda de eventos. Los canjes se guardan en esta cuenta y el administrador puede seguirlos.",
    "No token activity yet.": "Aún no hay actividad de tokens.",
    "Stay active or return tomorrow to start earning.": "Mantente activo o vuelve mañana para empezar a ganar.",
    "No Event Store redemptions yet.": "Aún no hay canjes de la Tienda de eventos.",
    "Limited items you redeem will appear here.": "Los artículos limitados que canjees aparecerán aquí.",
    "Daily login bonus": "Bono diario de inicio de sesión",
    "Active time": "Tiempo activo",
    "Purchase bonus": "Bono de compra",
    "Event Store redemption": "Canje de la Tienda de eventos",
    "Redemption refund": "Reembolso de canje",
    "Admin adjustment": "Ajuste del administrador",
    "Pending": "Pendiente",
    "Approved": "Aprobado",
    "In progress": "En progreso",
    "Delivered": "Entregado",
    "Cancelled": "Cancelado",
    "Refunded": "Reembolsado",
    "ZONE TOKEN REDEMPTION": "CANJE DE ZONE TOKENS",
    "Confirm your item": "Confirma tu artículo",
    "Roblox username for delivery": "Usuario de Roblox para la entrega",
    "Quantity": "Cantidad",
    "Redeem item": "Canjear artículo",
    "Enter your Roblox username.": "Introduce tu usuario de Roblox.",
    "Securing your item…": "Reservando tu artículo…",
    "Redeemed successfully": "Canje completado",
    "Redeemed": "Canjeado",
    "Could not load your wallet.": "No se pudo cargar tu cartera.",
    "Could not load the Event Store.": "No se pudo cargar la Tienda de eventos.",
    "every active minute": "por cada minuto activo",
    "when you return": "cuando vuelves",
    "after a paid order": "después de un pedido pagado",
    "Zone Tokens are free rewards with no cash value. They cannot be transferred or exchanged for money.": "Los Zone Tokens son recompensas gratuitas sin valor monetario. No pueden transferirse ni cambiarse por dinero."
  };

  const textOriginals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const skipSelectors = ["#adminDashboard", "#reviewContent", "#ordersSummary", "#ordersList", "#cartItems"];

  function isSkipped(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return !element || skipSelectors.some(selector => element.closest(selector));
  }

  function dynamicSpanish(value) {
    let match = value.match(/^Signed in as (.+)$/);
    if (match) return `Sesión iniciada como ${match[1]}`;

    match = value.match(/^Payment confirmed\. Order (.*?) is now saved in My Orders\.$/);
    if (match) return `Pago confirmado. El pedido ${match[1]} ya está guardado en Mis pedidos.`;

    match = value.match(/^Checkout error: (.+)$/);
    if (match) return `Error de pago: ${t(match[1])}`;

    match = value.match(/^Google sign-in failed: (.+)$/);
    if (match) return `Error al iniciar sesión con Google: ${match[1]}`;

    match = value.match(/^£([\d.,]+) or ([\d.,]+) R\$$/);
    if (match) return `£${match[1]} o ${match[2]} R$`;

    match = value.match(/^Request failed \((\d+)\)\.$/);
    if (match) return `La solicitud falló (${match[1]}).`;

    return value;
  }

  function t(value) {
    const source = String(value ?? "");
    if (currentLanguage !== "es") return source;
    return es[source] || dynamicSpanish(source);
  }

  function locale() {
    return currentLanguage === "es" ? "es-ES" : "en-GB";
  }

  function translateTextNode(node) {
    if (isSkipped(node)) return;
    if (!textOriginals.has(node)) textOriginals.set(node, node.nodeValue);
    const original = textOriginals.get(node);
    const trimmed = original.trim();
    if (!trimmed) return;
    const translated = t(trimmed);
    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    node.nodeValue = `${leading}${translated}${trailing}`;
  }

  function translateAttributes(element) {
    if (isSkipped(element)) return;
    const attributes = ["placeholder", "aria-label", "title"];
    let originals = attributeOriginals.get(element);
    if (!originals) {
      originals = {};
      attributeOriginals.set(element, originals);
    }
    for (const attribute of attributes) {
      if (!element.hasAttribute(attribute)) continue;
      if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute);
      element.setAttribute(attribute, t(originals[attribute]));
    }
  }

  function translateStatic(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "SVG", "PATH", "TEXT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return isSkipped(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);
    root.querySelectorAll?.("[placeholder], [aria-label], [title]").forEach(translateAttributes);

    document.documentElement.lang = currentLanguage;
    document.title = t("Zone6ix Customs");
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = currentLanguage === "es"
        ? "Zone6ix Customs: territorios personalizados premium, armas de banda y mejoras de identidad."
        : "Zone6ix Customs — premium custom turfs, gang weapons and identity upgrades.";
    }
  }

  function updateSwitch() {
    const current = document.getElementById("languageCurrent");
    const button = document.getElementById("languageButton");
    const menu = document.getElementById("languageMenu");
    if (current) current.textContent = currentLanguage.toUpperCase();
    if (button) button.setAttribute("aria-label", currentLanguage === "es" ? "Cambiar idioma" : "Change language");
    menu?.querySelectorAll("[data-language]").forEach(option => {
      const active = option.dataset.language === currentLanguage;
      option.classList.toggle("active", active);
      option.setAttribute("aria-checked", String(active));
    });
  }

  function closeMenu() {
    const menu = document.getElementById("languageMenu");
    const button = document.getElementById("languageButton");
    menu?.classList.remove("open");
    menu?.setAttribute("aria-hidden", "true");
    button?.setAttribute("aria-expanded", "false");
  }

  function setLanguage(language) {
    if (!supported.has(language) || language === currentLanguage) {
      closeMenu();
      return;
    }
    currentLanguage = language;
    localStorage.setItem(STORAGE_KEY, currentLanguage);
    translateStatic();
    updateSwitch();
    closeMenu();
    document.dispatchEvent(new CustomEvent("zone6ix-language-change", { detail: { language: currentLanguage } }));
  }

  function bindSwitch() {
    const button = document.getElementById("languageButton");
    const menu = document.getElementById("languageMenu");
    button?.addEventListener("click", event => {
      event.stopPropagation();
      const opening = !menu.classList.contains("open");
      menu.classList.toggle("open", opening);
      menu.setAttribute("aria-hidden", String(!opening));
      button.setAttribute("aria-expanded", String(opening));
    });
    menu?.addEventListener("click", event => event.stopPropagation());
    menu?.querySelectorAll("[data-language]").forEach(option => {
      option.addEventListener("click", () => setLanguage(option.dataset.language));
    });
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu();
    });
  }

  window.zone6ixI18n = {
    t,
    locale,
    getLanguage: () => currentLanguage,
    setLanguage,
    translateStatic
  };

  bindSwitch();
  translateStatic();
  updateSwitch();
})();
