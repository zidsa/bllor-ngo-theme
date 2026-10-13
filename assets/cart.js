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

  // The amount (or unit count) input that belongs to a button. A project can appear in
  // several cards on one page, so look inside the button's own card or form first.
  function inputFor(button) {
    var scope = button.closest("[data-donation-product-id], form");
    var selector = button.getAttribute("data-input");
    return (scope && scope.querySelector(selector)) || document.querySelector(selector);
  }

  // Reads and validates the amount (or unit count) for a donation button.
  function readQuantity(button) {
    var input = inputFor(button);
    var quantity = input ? parseInt(toEnglishDigits(input.value), 10) : 1;
    if (!quantity || quantity <= 0) {
      toast(t("enterAmount"), true);
      return null;
    }
    // The product form is read by the SDK, which does not understand Arabic digits.
    if (input) input.value = quantity;
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

  // On the product page the payload is read from #product-form (product id, amount and
  // custom fields); on cards it is the product id and the amount.
  function payloadFor(button, productId, quantity) {
    var form = button && button.getAttribute("data-form");
    return form ? { form_id: form } : { product_id: productId, quantity: quantity };
  }

  function addToCart(productId, quantity, button) {
    return waitForZid().then(function (zid) {
      return zid.cart.addProduct(payloadFor(button, productId, quantity), {
        showErrorNotification: true,
      });
    });
  }

  function cartUrl(query) {
    return (document.body.getAttribute("data-cart-url") || "/cart") + (query || "");
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
        addToCart(button.getAttribute("data-donation-add"), quantity, button).then(function (response) {
          setCartBadge(response && response.cart_items_quantity);
          toast(t("addedToCart"));
        })
      ).catch(function () {});
    } else if (now) {
      // Empties the cart and adds this donation. buyNow opens the login or checkout
      // dialog when the store uses them; otherwise go to the checkout page.
      withSpinner(
        button,
        waitForZid()
          .then(function (zid) {
            return zid.cart.buyNow(
              payloadFor(button, button.getAttribute("data-donation-now"), quantity),
              { showErrorNotification: true }
            );
          })
          .then(function (added) {
            if (added && !window.checkout_dialog && !window.checkoutDialogOpenBuyNow) {
              window.location.href = document.body.getAttribute("data-checkout-url") || "/checkout";
            }
          })
      ).catch(function () {});
    } else if (gift) {
      // A donation gift covers one project, as in the old storefront: the cart keeps only this
      // donation, then Vitrin's gift dialog on the cart page collects the details. The donation
      // is added before the other lines are removed, so a failed add leaves the cart as it was.
      withSpinner(
        button,
        waitForZid()
          .then(function (zid) {
            return zid.cart.get().then(function (current) {
              var previousLines = ((current && current.products) || []).map(function (line) {
                return String(line.id);
              });
              return addToCart(button.getAttribute("data-donation-gift"), quantity, button).then(function (response) {
                var addedLine = String((response && response.item && response.item.id) || "");
                return Promise.all(
                  previousLines.map(function (lineId) {
                    // The project was already in the cart: keep only the amount gifted now.
                    if (lineId === addedLine) {
                      return zid.cart.updateProduct({ product_id: lineId, quantity: quantity }, { showErrorNotification: true });
                    }
                    return zid.cart.removeProduct({ product_id: lineId, options: { showErrorNotification: true } });
                  })
                );
              });
            });
          })
          .then(function () {
            window.location.href = cartUrl("?gift=1");
          })
      ).catch(function () {});
    }
  });

  document.addEventListener("DOMContentLoaded", refreshCartBadge);
})();
