<doc>
A popup that contains a form to be submitted or modified.
</doc>

<template>
    <BasePopup v-bind="$attrs">
        <h1 class="title">{{ title }}</h1>
        <form class="form-popup" @submit.prevent="submit">
            <formly-form
                ref="form"
                :form="form"
                :model="model"
                :fields="fields"
            />
            <div class="buttons">
                <slot name="buttons">
                    <button>Save</button>
                    <button
                        v-if="allowHide"
                        @click="hide"
                        class="cancel"
                        type="button"
                    >Cancel</button>
                </slot>
            </div>
        </form>
    </BasePopup>
</template>

<script>
import { fromPairs, toPairs } from 'lodash';

import store from 'store';

import BasePopup from './BasePopup';

export default {
    extends: BasePopup,
    props: {
        title: {
            // Title at top of popup
            type: String,
            required: true,
        },
        onSubmit: {
            // Callback to run when form submits. Takes in
            // the model data. Return false to disable hiding
            // the popup automatically.
            type: Function,
            required: true,
        },
        model: {
            // Model for vue-formly
            type: null,
            required: true,
        },
        fields: {
            // Field definitions for vue-formly
            type: null,
            required: true,
        },
    },
    components: { BasePopup },
    data() {
        return {
            form: {},
        };
    },
    methods: {
        /**
         * Submit the form.
         */
        submit() {
            this.$refs.form.validate()
                .then(() => {
                    if (!this.form.$valid) {
                        return;
                    }

                    // this.model is a Vue proxy, need to force
                    // out data
                    let data = fromPairs(toPairs(this.model));
                    let result = this.onSubmit(data);
                    if (result !== false) {
                        this.hide();
                    }
                })
                .catch(e => {
                    // BUG: closing error message should not close popup
                    store.dispatch('messages/showError', e.message);
                });
        },
    },
};
</script>

<style lang="scss" scoped>
    button.cancel {
        @include display-button($red);
    }
</style>
