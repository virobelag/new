(function($) {
    // Ensure a hidden field exists and is set
    function ensureHiddenField($form, fieldKey, value) {
        if (!value) return;
        var sel = 'input[type="hidden"][name="form_fields[' + fieldKey + ']"]';
        var $existing = $form.find(sel);
        if ($existing.length) {
            $existing.val(value);
        } else {
            $('<input>', {
                type: 'hidden',
                name: 'form_fields[' + fieldKey + ']',
                value: value
            }).appendTo($form);
        }
    }

    // Get wrapper CSS ID
    function getWrapperCssId($form) {
        var $wrapper = $form.closest('.elementor-element.elementor-widget-form, .elementor-widget-form, .elementor-element');
        return $wrapper.attr('id') || '';
    }

    // Get form name (fallbacks if name is missing)
    function getFormName($form) {
        return $form.attr('name') || $form.attr('aria-label') || '';
    }

    function captureForm($form) {
        // Pre-inject on init so it’s present even before submit handlers run
        var cssId  = getWrapperCssId($form);
        var fName  = getFormName($form);
        ensureHiddenField($form, 'form_css_id', cssId);
        ensureHiddenField($form, 'form_name', fName);

        $form.on('submit', function() {
            const formData = {};

            // Collect existing fields
            $(this).find('input, textarea, select').each(function() {
                const name = $(this).attr('name');
                const value = $(this).val();
                if (name) {
                    const key = name.startsWith('form_fields[') ? name : `form_fields[${name}]`;
                    formData[key] = value;
                }
            });

            // Refresh (in case DOM changed)
            const cssIdNow = getWrapperCssId($form);
            const fNameNow = getFormName($form);

            // Persist plain keys for your placeholders
            formData['form_css_id'] = cssIdNow;
            formData['form_name']   = fNameNow;

            // Make sure they’re part of the submission
            formData['form_fields[form_css_id]'] = cssIdNow;
            formData['form_fields[form_name]']   = fNameNow;

            ensureHiddenField($form, 'form_css_id', cssIdNow);
            ensureHiddenField($form, 'form_name',   fNameNow);

            sessionStorage.setItem('elementorFormData', JSON.stringify(formData));
        });
    }

    // Elementor init hook
    jQuery(window).on('elementor/frontend/init', function() {
        if (typeof elementorFrontend !== 'undefined' && elementorFrontend.hooks) {
            elementorFrontend.hooks.addAction('elementor_pro/forms/new', function(form) {
                if (form && form.$form.closest('.pass-form-data-ty').length) {
                    captureForm(form.$form);
                }
            });
        }
    });

    // Fallback (DOM ready)
    $(function() {
        $('.pass-form-data-ty .elementor-form').each(function() {
            captureForm($(this));
        });
    });

    // Session placeholder replacement + repopulate
    document.addEventListener('DOMContentLoaded', function () {
        const placeholders = document.querySelectorAll('[data-session-field]');
        const formData = JSON.parse(sessionStorage.getItem('elementorFormData') || '{}');

        placeholders.forEach(el => {
            const key = el.getAttribute('data-session-field');
            const value = formData[`form_fields[${key}]`] || formData[key];
            if (value) {
                const textNode = document.createTextNode(value);
                el.replaceWith(textNode);
            }
        });

        function waitAndPopulateFields(retries = 10) {
            const formData = JSON.parse(sessionStorage.getItem('elementorFormData') || '{}');
            let fieldsPopulated = false;

            Object.keys(formData).forEach(key => {
                const match = key.match(/^form_fields\[(.+)\]$/);
                if (match && match[1]) {
                    const fieldKey = match[1];
                    const input = document.querySelector(`.pass-form-data-ty .elementor-form [name="form_fields[${fieldKey}]"]`);
                    if (input && input.tagName.toLowerCase() === 'input') {
                        input.value = formData[key];
                        fieldsPopulated = true;
                    }
                }
            });

            if (!fieldsPopulated && retries > 0) {
                setTimeout(() => waitAndPopulateFields(retries - 1), 100);
            }
        }

        waitAndPopulateFields();
        //sessionStorage.removeItem('elementorFormData');
    });
})(jQuery);