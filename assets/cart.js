/*
 * Donation cart actions on Vitrin's theme SDK (window.zid).
 *
 * A donation is a product priced at 1 whose quantity is the amount, so every action
 * sends the amount typed by the donor as `quantity`.
 */
(function () {
  var t = function (key) {
    return (window.bllorTranslations || {})[key] || "";
  };

  function waitForZid() {
    return new Promise(function (resolve) {
      if (window.zid && window.zid.cart) return resolve(window.zid);
      var timer = setInterval(function () {
        if (window.zid && window.zid.cart) {
          clearInterval(timer);
          resolve(window.zid);
        }
      }, 50);
    });
  }

  function toast(text, isError) {
    if (!text || !window.jQuery || !jQuery.toast) return;
    jQuery.toast({
      text: text,
      showHideTransition: "fade",
      allowToastClose: true,
      hideAfter: 2500,
      position: "top-right",
      textAlign: "center",
      bgColor: isError ? "#d90000" : "#d4edda",
      textColor: isError ? "#fff" : "#155724",
    });
  }

  function toEnglishDigits(value) {
    return String(value || "").replace(/[٠-٩]/g, function (d) {
      return String(d.charCodeAt(0) - 0x0660);
    });
  }

  // Reads and validates the amount (or unit count) for a donation button.
  function readQuantity(button) {
    var input = document.querySelector(button.getAttribute("data-input"));
    var quantity = input ? parseInt(toEnglishDigits(input.value), 10) : 1;
    if (!quantity || quantity <= 0) {
      toast(t("enterAmount"), true);
      return null;
    }
    var max = input && parseInt(input.getAttribute("data-max") || input.getAttribute("max"), 10);
    if (max && quantity > max) {
      input.value = max;
      toast(t("maxAmount").replace("%s", max), true);
      return null;
    }
    return quantity;
  }

  function withSpinner(button, promise) {
    var html = button.innerHTML;
    button.disabled = true;
    button.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status"></span>';
    return promise.finally(function () {
      button.disabled = false;
      button.innerHTML = html;
    });
  }

  function setCartBadge(count) {
    document.querySelectorAll(".cart-badge").forEach(function (badge) {
      badge.textContent = count;
      badge.classList.toggle("d-none", !(count > 0));
    });
    var tooltip = document.getElementById("gift-tooltip");
    if (tooltip && count > 0) {
      tooltip.classList.remove("d-none");
      setTimeout(function () {
        tooltip.classList.add("d-none");
      }, 7000);
    }
  }

  function refreshCartBadge() {
    return waitForZid()
      .then(function (zid) {
        return zid.cart.get();
      })
      .then(function (cart) {
        var count = cart && (cart.cart_items_quantity != null ? cart.cart_items_quantity : cart.products_count);
        setCartBadge(count || 0);
      })
      .catch(function () {});
  }

  function addToCart(productId, quantity) {
    return waitForZid().then(function (zid) {
      return zid.cart.addProduct(
        { product_id: productId, quantity: quantity },
        { showErrorNotification: true }
      );
    });
  }

  window.bllorCart = {
    waitForZid: waitForZid,
    toast: toast,
    addToCart: addToCart,
    refreshCartBadge: refreshCartBadge,
    toEnglishDigits: toEnglishDigits,
  };

  document.addEventListener("click", function (event) {
    var add = event.target.closest("[data-donation-add]");
    var now = event.target.closest("[data-donation-now]");
    var gift = event.target.closest("[data-donation-gift]");
    var button = add || now || gift;
    if (!button) return;

    var quantity = readQuantity(button);
    if (!quantity) return;

    if (add) {
      withSpinner(
        button,
        addToCart(button.getAttribute("data-donation-add"), quantity).then(function (response) {
          setCartBadge(response && response.cart_items_quantity);
          toast(t("addedToCart"));
        })
      ).catch(function () {});
    } else if (now) {
      // Empties the cart, adds this donation and opens checkout (or login for guests).
      withSpinner(
        button,
        waitForZid().then(function (zid) {
          return zid.cart.buyNow(
            { product_id: button.getAttribute("data-donation-now"), quantity: quantity },
            { showErrorNotification: true }
          );
        })
      ).catch(function () {});
    } else if (gift) {
      // Gift details are collected by Vitrin's gift dialog on the cart page.
      withSpinner(
        button,
        addToCart(button.getAttribute("data-donation-gift"), quantity).then(function () {
          window.location.href = "/cart?gift=1";
        })
      ).catch(function () {});
    }
  });

  document.addEventListener("DOMContentLoaded", refreshCartBadge);
})();
