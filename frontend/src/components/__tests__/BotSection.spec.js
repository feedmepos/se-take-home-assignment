import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BotSection from '../BotSection.vue'

describe('BotSection', () => {
  it('renders active bots correctly', () => {
    const bots = [
      { id: 1, status: 'IDLE', current_order_id: null },
      { id: 2, status: 'PROCESSING', current_order_id: 123 }
    ]
    const wrapper = mount(BotSection, {
      props: { bots }
    })
    
    expect(wrapper.text()).toContain('Active Bots (2)')
    expect(wrapper.findAll('.bot-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Bot #1')
    expect(wrapper.text()).toContain('Bot #2')
  })

  it('renders empty state when no bots are active', () => {
    const wrapper = mount(BotSection, {
      props: { bots: [] }
    })
    
    expect(wrapper.text()).toContain('No bots active')
    expect(wrapper.findAll('.bot-card')).toHaveLength(0)
  })

  it('applies processing class to processing bots', () => {
    const bots = [
      { id: 1, status: 'PROCESSING', current_order_id: 123 }
    ]
    const wrapper = mount(BotSection, {
      props: { bots }
    })
    
    const card = wrapper.find('.bot-card')
    expect(card.classes()).toContain('processing')
    expect(wrapper.text()).toContain('Processing Order #123')
  })
})
