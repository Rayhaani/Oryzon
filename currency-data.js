/* ============================================================
   NEXUS CURRENCY SYSTEM — currency-data.js  (v1.0)
   ------------------------------------------------------------
   An fitar da wannan daga services.js domin ya zama shared,
   global-once module maimakon a sake halitta babban CURRENCIES
   array din (kasashe 150+) a duk lokacin da mutum ya shiga ko
   ya koma services.html — wanda shine daya daga cikin manyan
   dalilan da suke haddasa jinkirin loda services page.

   Wannan file BA YA shiga cikin NexusRouter's PAGE_SCRIPTS —
   ana loda shi KAMAR nexus-core.js: script tag guda daya a
   <head>/script section na KOWANE page da yake amfani da
   CURRENCIES/formatPrice/currency picker (services.html, kuma
   duk wata page mai amfani da su nan gaba — misali shop.html,
   chat.html, da sauransu). Idan aka loda shi ta wannan hanyar,
   zai zauna a memory sau daya kacal muddin app din bata yi
   FULL page reload ba — SPA navigation ta router.js ba za ta
   sake shi ba.

   Kada a sake ayyana CURRENCIES ko wadannan functions a cikin
   wani file — idan wata page tana bukatar su, kawai a saka:
       <script src="currency-data.js"></script>
   kafin script din wannan page (misali kafin services.js).
   ============================================================ */

// ── CURRENCY SYSTEM ──
const CURRENCIES = [
    { code: "AED", symbol: "د.إ", label: "UAE Dirham", flag: "🇦🇪" },
    { code: "AFN", symbol: "؋", label: "Afghan Afghani", flag: "🇦🇫" },
    { code: "ALL", symbol: "L", label: "Albanian Lek", flag: "🇦🇱" },
    { code: "AMD", symbol: "֏", label: "Armenian Dram", flag: "🇦🇲" },
    { code: "ANG", symbol: "ƒ", label: "Netherlands Antillean Guilder", flag: "🇨🇼" },
    { code: "AOA", symbol: "Kz", label: "Angolan Kwanza", flag: "🇦🇴" },
    { code: "ARS", symbol: "$", label: "Argentine Peso", flag: "🇦🇷" },
    { code: "AUD", symbol: "$", label: "Australian Dollar", flag: "🇦🇺" },
    { code: "AWG", symbol: "ƒ", label: "Aruban Florin", flag: "🇦🇼" },
    { code: "AZN", symbol: "₼", label: "Azerbaijani Manat", flag: "🇦🇿" },
    { code: "BAM", symbol: "KM", label: "Bosnia-Herzegovina Mark", flag: "🇧🇦" },
    { code: "BBD", symbol: "$", label: "Barbadian Dollar", flag: "🇧🇧" },
    { code: "BDT", symbol: "৳", label: "Bangladeshi Taka", flag: "🇧🇩" },
    { code: "BGN", symbol: "лв", label: "Bulgarian Lev", flag: "🇧🇬" },
    { code: "BHD", symbol: ".د.ب", label: "Bahraini Dinar", flag: "🇧🇭" },
    { code: "BIF", symbol: "FBu", label: "Burundian Franc", flag: "🇧🇮" },
    { code: "BMD", symbol: "$", label: "Bermudan Dollar", flag: "🇧🇲" },
    { code: "BND", symbol: "$", label: "Brunei Dollar", flag: "🇧🇳" },
    { code: "BOB", symbol: "Bs.", label: "Bolivian Boliviano", flag: "🇧🇴" },
    { code: "BRL", symbol: "R$", label: "Brazilian Real", flag: "🇧🇷" },
    { code: "BSD", symbol: "$", label: "Bahamian Dollar", flag: "🇧🇸" },
    { code: "BTN", symbol: "Nu.", label: "Bhutanese Ngultrum", flag: "🇧🇹" },
    { code: "BWP", symbol: "P", label: "Botswanan Pula", flag: "🇧🇼" },
    { code: "BYN", symbol: "Br", label: "Belarusian Ruble", flag: "🇧🇾" },
    { code: "BZD", symbol: "$", label: "Belize Dollar", flag: "🇧🇿" },
    { code: "CAD", symbol: "$", label: "Canadian Dollar", flag: "🇨🇦" },
    { code: "CDF", symbol: "FC", label: "Congolese Franc", flag: "🇨🇩" },
    { code: "CHF", symbol: "Fr", label: "Swiss Franc", flag: "🇨🇭" },
    { code: "CLP", symbol: "$", label: "Chilean Peso", flag: "🇨🇱" },
    { code: "CNY", symbol: "¥", label: "Chinese Yuan", flag: "🇨🇳" },
    { code: "COP", symbol: "$", label: "Colombian Peso", flag: "🇨🇴" },
    { code: "CRC", symbol: "₡", label: "Costa Rican Colón", flag: "🇨🇷" },
    { code: "CUP", symbol: "$", label: "Cuban Peso", flag: "🇨🇺" },
    { code: "CVE", symbol: "$", label: "Cape Verdean Escudo", flag: "🇨🇻" },
    { code: "CZK", symbol: "Kč", label: "Czech Koruna", flag: "🇨🇿" },
    { code: "DJF", symbol: "Fdj", label: "Djiboutian Franc", flag: "🇩🇯" },
    { code: "DKK", symbol: "kr", label: "Danish Krone", flag: "🇩🇰" },
    { code: "DOP", symbol: "$", label: "Dominican Peso", flag: "🇩🇴" },
    { code: "DZD", symbol: "دج", label: "Algerian Dinar", flag: "🇩🇿" },
    { code: "EGP", symbol: "£", label: "Egyptian Pound", flag: "🇪🇬" },
    { code: "ERN", symbol: "Nfk", label: "Eritrean Nakfa", flag: "🇪🇷" },
    { code: "ETB", symbol: "Br", label: "Ethiopian Birr", flag: "🇪🇹" },
    { code: "EUR", symbol: "€", label: "Euro", flag: "🇪🇺" },
    { code: "FJD", symbol: "$", label: "Fijian Dollar", flag: "🇫🇯" },
    { code: "GBP", symbol: "£", label: "British Pound", flag: "🇬🇧" },
    { code: "GEL", symbol: "₾", label: "Georgian Lari", flag: "🇬🇪" },
    { code: "GHS", symbol: "₵", label: "Ghanaian Cedi", flag: "🇬🇭" },
    { code: "GMD", symbol: "D", label: "Gambian Dalasi", flag: "🇬🇲" },
    { code: "GNF", symbol: "FG", label: "Guinean Franc", flag: "🇬🇳" },
    { code: "GTQ", symbol: "Q", label: "Guatemalan Quetzal", flag: "🇬🇹" },
    { code: "GYD", symbol: "$", label: "Guyanaese Dollar", flag: "🇬🇾" },
    { code: "HKD", symbol: "$", label: "Hong Kong Dollar", flag: "🇭🇰" },
    { code: "HNL", symbol: "L", label: "Honduran Lempira", flag: "🇭🇳" },
    { code: "HRK", symbol: "kn", label: "Croatian Kuna", flag: "🇭🇷" },
    { code: "HTG", symbol: "G", label: "Haitian Gourde", flag: "🇭🇹" },
    { code: "HUF", symbol: "Ft", label: "Hungarian Forint", flag: "🇭🇺" },
    { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah", flag: "🇮🇩" },
    { code: "ILS", symbol: "₪", label: "Israeli New Shekel", flag: "🇮🇱" },
    { code: "INR", symbol: "₹", label: "Indian Rupee", flag: "🇮🇳" },
    { code: "IQD", symbol: "ع.د", label: "Iraqi Dinar", flag: "🇮🇶" },
    { code: "IRR", symbol: "﷼", label: "Iranian Rial", flag: "🇮🇷" },
    { code: "ISK", symbol: "kr", label: "Icelandic Króna", flag: "🇮🇸" },
    { code: "JMD", symbol: "$", label: "Jamaican Dollar", flag: "🇯🇲" },
    { code: "JOD", symbol: "د.ا", label: "Jordanian Dinar", flag: "🇯🇴" },
    { code: "JPY", symbol: "¥", label: "Japanese Yen", flag: "🇯🇵" },
    { code: "KES", symbol: "KSh", label: "Kenyan Shilling", flag: "🇰🇪" },
    { code: "KGS", symbol: "с", label: "Kyrgystani Som", flag: "🇰🇬" },
    { code: "KHR", symbol: "៛", label: "Cambodian Riel", flag: "🇰🇭" },
    { code: "KMF", symbol: "CF", label: "Comorian Franc", flag: "🇰🇲" },
    { code: "KRW", symbol: "₩", label: "South Korean Won", flag: "🇰🇷" },
    { code: "KWD", symbol: "د.ك", label: "Kuwaiti Dinar", flag: "🇰🇼" },
    { code: "KZT", symbol: "₸", label: "Kazakhstani Tenge", flag: "🇰🇿" },
    { code: "LAK", symbol: "₭", label: "Laotian Kip", flag: "🇱🇦" },
    { code: "LBP", symbol: "ل.ل", label: "Lebanese Pound", flag: "🇱🇧" },
    { code: "LKR", symbol: "Rs", label: "Sri Lankan Rupee", flag: "🇱🇰" },
    { code: "LRD", symbol: "$", label: "Liberian Dollar", flag: "🇱🇷" },
    { code: "LSL", symbol: "L", label: "Lesotho Loti", flag: "🇱🇸" },
    { code: "LYD", symbol: "ل.د", label: "Libyan Dinar", flag: "🇱🇾" },
    { code: "MAD", symbol: "د.م.", label: "Moroccan Dirham", flag: "🇲🇦" },
    { code: "MDL", symbol: "L", label: "Moldovan Leu", flag: "🇲🇩" },
    { code: "MGA", symbol: "Ar", label: "Malagasy Ariary", flag: "🇲🇬" },
    { code: "MKD", symbol: "ден", label: "Macedonian Denar", flag: "🇲🇰" },
    { code: "MMK", symbol: "K", label: "Myanmar Kyat", flag: "🇲🇲" },
    { code: "MNT", symbol: "₮", label: "Mongolian Tugrik", flag: "🇲🇳" },
    { code: "MOP", symbol: "MOP$", label: "Macanese Pataca", flag: "🇲🇴" },
    { code: "MRU", symbol: "UM", label: "Mauritanian Ouguiya", flag: "🇲🇷" },
    { code: "MUR", symbol: "₨", label: "Mauritian Rupee", flag: "🇲🇺" },
    { code: "MVR", symbol: "Rf", label: "Maldivian Rufiyaa", flag: "🇲🇻" },
    { code: "MWK", symbol: "MK", label: "Malawian Kwacha", flag: "🇲🇼" },
    { code: "MXN", symbol: "$", label: "Mexican Peso", flag: "🇲🇽" },
    { code: "MYR", symbol: "RM", label: "Malaysian Ringgit", flag: "🇲🇾" },
    { code: "MZN", symbol: "MT", label: "Mozambican Metical", flag: "🇲🇿" },
    { code: "NAD", symbol: "$", label: "Namibian Dollar", flag: "🇳🇦" },
    { code: "NGN", symbol: "₦", label: "Nigerian Naira", flag: "🇳🇬" },
    { code: "NIO", symbol: "C$", label: "Nicaraguan Córdoba", flag: "🇳🇮" },
    { code: "NOK", symbol: "kr", label: "Norwegian Krone", flag: "🇳🇴" },
    { code: "NPR", symbol: "₨", label: "Nepalese Rupee", flag: "🇳🇵" },
    { code: "NZD", symbol: "$", label: "New Zealand Dollar", flag: "🇳🇿" },
    { code: "OMR", symbol: "ر.ع.", label: "Omani Rial", flag: "🇴🇲" },
    { code: "PAB", symbol: "B/.", label: "Panamanian Balboa", flag: "🇵🇦" },
    { code: "PEN", symbol: "S/.", label: "Peruvian Sol", flag: "🇵🇪" },
    { code: "PGK", symbol: "K", label: "Papua New Guinean Kina", flag: "🇵🇬" },
    { code: "PHP", symbol: "₱", label: "Philippine Peso", flag: "🇵🇭" },
    { code: "PKR", symbol: "₨", label: "Pakistani Rupee", flag: "🇵🇰" },
    { code: "PLN", symbol: "zł", label: "Polish Złoty", flag: "🇵🇱" },
    { code: "PYG", symbol: "₲", label: "Paraguayan Guarani", flag: "🇵🇾" },
    { code: "QAR", symbol: "ر.ق", label: "Qatari Rial", flag: "🇶🇦" },
    { code: "RON", symbol: "lei", label: "Romanian Leu", flag: "🇷🇴" },
    { code: "RSD", symbol: "дин.", label: "Serbian Dinar", flag: "🇷🇸" },
    { code: "RUB", symbol: "₽", label: "Russian Ruble", flag: "🇷🇺" },
    { code: "RWF", symbol: "FRw", label: "Rwandan Franc", flag: "🇷🇼" },
    { code: "SAR", symbol: "ر.س", label: "Saudi Riyal", flag: "🇸🇦" },
    { code: "SBD", symbol: "$", label: "Solomon Islands Dollar", flag: "🇸🇧" },
    { code: "SCR", symbol: "₨", label: "Seychellois Rupee", flag: "🇸🇨" },
    { code: "SDG", symbol: "ج.س.", label: "Sudanese Pound", flag: "🇸🇩" },
    { code: "SEK", symbol: "kr", label: "Swedish Krona", flag: "🇸🇪" },
    { code: "SGD", symbol: "$", label: "Singapore Dollar", flag: "🇸🇬" },
    { code: "SLL", symbol: "Le", label: "Sierra Leonean Leone", flag: "🇸🇱" },
    { code: "SOS", symbol: "Sh", label: "Somali Shilling", flag: "🇸🇴" },
    { code: "SRD", symbol: "$", label: "Surinamese Dollar", flag: "🇸🇷" },
    { code: "SSP", symbol: "£", label: "South Sudanese Pound", flag: "🇸🇸" },
    { code: "STN", symbol: "Db", label: "São Tomé & Príncipe Dobra", flag: "🇸🇹" },
    { code: "SYP", symbol: "£", label: "Syrian Pound", flag: "🇸🇾" },
    { code: "SZL", symbol: "L", label: "Swazi Lilangeni", flag: "🇸🇿" },
    { code: "THB", symbol: "฿", label: "Thai Baht", flag: "🇹🇭" },
    { code: "TJS", symbol: "SM", label: "Tajikistani Somoni", flag: "🇹🇯" },
    { code: "TMT", symbol: "m", label: "Turkmenistani Manat", flag: "🇹🇲" },
    { code: "TND", symbol: "د.ت", label: "Tunisian Dinar", flag: "🇹🇳" },
    { code: "TOP", symbol: "T$", label: "Tongan Paʻanga", flag: "🇹🇴" },
    { code: "TRY", symbol: "₺", label: "Turkish Lira", flag: "🇹🇷" },
    { code: "TTD", symbol: "$", label: "Trinidad & Tobago Dollar", flag: "🇹🇹" },
    { code: "TWD", symbol: "$", label: "New Taiwan Dollar", flag: "🇹🇼" },
    { code: "TZS", symbol: "Sh", label: "Tanzanian Shilling", flag: "🇹🇿" },
    { code: "UAH", symbol: "₴", label: "Ukrainian Hryvnia", flag: "🇺🇦" },
    { code: "UGX", symbol: "USh", label: "Ugandan Shilling", flag: "🇺🇬" },
    { code: "USD", symbol: "$", label: "US Dollar", flag: "🇺🇸" },
    { code: "UYU", symbol: "$U", label: "Uruguayan Peso", flag: "🇺🇾" },
    { code: "UZS", symbol: "so'm", label: "Uzbekistan Som", flag: "🇺🇿" },
    { code: "VES", symbol: "Bs.S", label: "Venezuelan Bolívar", flag: "🇻🇪" },
    { code: "VND", symbol: "₫", label: "Vietnamese Dong", flag: "🇻🇳" },
    { code: "VUV", symbol: "VT", label: "Vanuatu Vatu", flag: "🇻🇺" },
    { code: "WST", symbol: "WS$", label: "Samoan Tala", flag: "🇼🇸" },
    { code: "XAF", symbol: "FCFA", label: "Central African CFA", flag: "🌍" },
    { code: "XCD", symbol: "$", label: "East Caribbean Dollar", flag: "🌍" },
    { code: "XOF", symbol: "CFA", label: "West African CFA", flag: "🌍" },
    { code: "YER", symbol: "﷼", label: "Yemeni Rial", flag: "🇾🇪" },
    { code: "ZAR", symbol: "R", label: "South African Rand", flag: "🇿🇦" },
    { code: "ZMW", symbol: "ZK", label: "Zambian Kwacha", flag: "🇿🇲" },
    { code: "ZWL", symbol: "$", label: "Zimbabwean Dollar", flag: "🇿🇼" }
];
        
function getCurrencySymbol(code) {
    const found = CURRENCIES.find(c => c.code === code);
    return found ? found.symbol : ""; // babu default — idan babu code, babu symbol
        }

function formatPrice(amount, currencyCode) {
    const symbol = getCurrencySymbol(currencyCode);
    const num = typeof amount === "number" ? amount : parseInt(amount) || 0;
    return `${symbol}${num.toLocaleString()}`;
}

let currencyPickerTargetId = null; // id na trigger button da za a sabunta

  function renderCurrencyList(list) {
    const currentCode = document.getElementById(currencyPickerTargetId)?.dataset.currency || ""; 
    const container = document.getElementById("currency-picker-list");
    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px 16px;color:rgba(255,255,255,0.3);font-size:12px;">Babu wata currency da ta dace</div>`;
        return;
    }
    container.innerHTML = list.map(c => `
        <div class="currency-row ${c.code === currentCode ? 'selected' : ''}" onclick="selectCurrency('${c.code}')">
            <div class="currency-row-left">
                <span style="font-size:16px;">${c.flag}</span>
                <span class="currency-row-symbol">${c.symbol}</span>
                <span class="currency-row-label">${c.label} (${c.code})</span>
            </div>
            <span class="currency-row-check">✓</span>
        </div>`).join('');
}

function filterCurrencyList(query) {
    const q = query.trim().toLowerCase();
    const filtered = q === ""
        ? CURRENCIES
        : CURRENCIES.filter(c =>
            c.code.toLowerCase().includes(q) ||
            c.label.toLowerCase().includes(q) ||
            c.symbol.toLowerCase().includes(q)
          );
    renderCurrencyList(filtered);
}

function openCurrencyPicker(targetId) {
    currencyPickerTargetId = targetId;
    document.getElementById("currency-search-input").value = "";
    renderCurrencyList(CURRENCIES);
    const backdrop = document.getElementById("currency-picker-backdrop");
    const panel = document.getElementById("currency-picker-panel");
    backdrop.style.display = "flex";
    setTimeout(() => {
        panel.style.transform = "scale(1)";
        panel.style.opacity = "1";
    }, 10);
}

function closeCurrencyPicker() {
    const backdrop = document.getElementById("currency-picker-backdrop");
    const panel = document.getElementById("currency-picker-panel");
    panel.style.transform = "scale(0.9)";
    panel.style.opacity = "0";
    setTimeout(() => { backdrop.style.display = "none"; }, 300);
        }

function selectCurrency(code) {
    if (!currencyPickerTargetId) return;
    const btn = document.getElementById(currencyPickerTargetId);
    const c = CURRENCIES.find(x => x.code === code);
    btn.dataset.currency = code;
    btn.innerHTML = `${c.symbol} ${c.code} <span style="font-size:9px;opacity:0.5;">▾</span>`;
    closeCurrencyPicker();
        }
        
function buildCurrencyDropdownHtml(id, selectedCode) {
    const sel = selectedCode || "NGN";
    return `<select id="${id}" style="width:100px;background:rgba(20,25,45,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#ffffff;font-size:12px;padding:10px 6px;outline:none;">
        ${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === sel ? "selected" : ""}>${c.symbol} ${c.code}</option>`).join('')}
    </select>`;
        }

function populateCurrencyDropdowns() {
    document.querySelectorAll('.currency-select-slot').forEach(sel => {
        if (sel.dataset.populated) return; // kar a sake cika idan an riga an yi
        sel.innerHTML = CURRENCIES.map(c => `<option value="${c.code}">${c.symbol} ${c.code}</option>`).join('');
        sel.dataset.populated = "true";
    });
        }

