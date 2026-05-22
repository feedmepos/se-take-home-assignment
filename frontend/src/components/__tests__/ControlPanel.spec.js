import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ControlPanel from '../ControlPanel.vue'

describe('ControlPanel', () => {
  it('emits add-normal event when normal order button is clicked', async () => {
    const wrapper = mount(ControlPanel)
    await wrapper.find('.btn.primary').trigger('click')
    expect(wrapper.emitted('add-normal')).toBeTruthy()
  })

  it('emits add-vip event when vip order button is clicked', async () => {
    const wrapper = mount(ControlPanel)
    await wrapper.find('.btn.vip').trigger('click')
    expect(wrapper.emitted('add-vip')).toBeTruthy()
  })

  it('emits add-bot event when add bot button is clicked', async () => {
    const wrapper = mount(ControlPanel)
    await wrapper.find('.btn.secondary').trigger('click')
    expect(wrapper.emitted('add-bot')).toBeTruthy()
  })

  it('emits remove-bot event when remove bot button is clicked', async () => {
    const wrapper = mount(ControlPanel)
    await wrapper.find('.btn.danger').trigger('click')
    expect(wrapper.emitted('remove-bot')).toBeTruthy()
  })
})
