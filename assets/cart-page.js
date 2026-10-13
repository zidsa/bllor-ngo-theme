/*
 * Cart page: change a donation amount or unit count, remove a line, and open Vitrin's
 * gift dialog. The page reloads after a change so totals come from the server.
 */
(function () {
  var cart = window.bllorCart;
  var t = function (key) {
    return (window.bllorTranslations || {})[key] || "";
  };

  // Vitrin's cart script refreshes the list itself unless the theme handles it.
  window.ZidCart = window.ZidCart || {};
  if (window.ZidCart.registerCustomHandler) window.ZidCart.registerCustomHandler();
  window.ZidCart._hasCustomHandler = true;

  function reload() {
    window.location.href = window.location.pathname;
  }

  var pending = {};
  document.addEventListener("change", function (event) {
    var input = event.target.closest("[data-cart-quantity]");
    if (!input) return;
    var lineId = input.getAttribute("data-cart-quantity");
    var quantity = parseInt(cart.toEnglishDigits(input.value), 10);
    var max = parseInt(input.getAttribute("data-max"), 10);
    if (!quantity || quantity <= 0) {
      cart.toast(t("enterAmount"), true);
      return;
    }
    if (max && quantity > max) {
      input.value = max;
      cart.toast(t("maxAmount").replace("%s", max), true);
      return;
    }
    if (pending[lineId]) return;
    pending[lineId] = true;
    input.disabled = true;
    cart
      .waitForZid()
      .then(function (zid) {
        return zid.cart.updateProduct({ product_id: lineId, quantity: quantity }, { showErrorNotification: true });
      })
      .then(reload)
      .catch(function () {
        input.disabled = false;
        pending[lineId] = false;
      });
  });

  document.addEventListener("click", function (event) {
    var remove = event.target.closest("[data-remove-line]");
    var removeGift = event.target.closest("[data-remove-gift]");
    var openGift = event.target.closest("[data-open-gift]");
    if (remove) {
      cart
        .waitForZid()
        .then(function (zid) {
          return zid.cart.removeProduct({ product_id: remove.getAttribute("data-remove-line"), options: { showErrorNotification: true } });
        })
        .then(reload)
        .catch(function () {});
    } else if (removeGift) {
      cart
        .waitForZid()
        .then(function (zid) {
          return zid.cart.removeGiftCard({ showErrorNotification: true });
        })
        .then(reload)
        .catch(function () {});
    } else if (openGift) {
      openGiftDialog();
    }
  });

  // Gift details need a signed-in donor, then Vitrin's gift dialog collects them.
  function openGiftDialog() {
    if (document.body.getAttribute("data-is-guest") === "true") {
      if (window.auth_dialog && window.auth_dialog.open) {
        window.auth_dialog.open();
      } else {
        window.location.href = (document.body.getAttribute("data-login-url") || "/auth/login") + "?redirect_to=" + encodeURIComponent(window.location.pathname + "?gift=1");
      }
      return;
    }
    if (window.gift_dialog && window.gift_dialog.open) window.gift_dialog.open();
  }

  document.addEventListener("DOMContentLoaded", function () {
    // The gift button is only on the page when the cart can become a gift (one project).
    var canGift = document.querySelector("[data-open-gift]");
    if (canGift && new URLSearchParams(window.location.search).get("gift") === "1") {
      var tries = 0;
      var timer = setInterval(function () {
        if (window.gift_dialog || ++tries > 40) {
          clearInterval(timer);
          openGiftDialog();
        }
      }, 100);
    }
  });
})();
