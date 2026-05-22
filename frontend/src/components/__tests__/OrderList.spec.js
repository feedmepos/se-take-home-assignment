import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OrderList from '../OrderList.vue'

describe('OrderList', () => {
  it('renders title and order count', () => {
    const orders = [
      { id: 1, type: 'Normal', status: 'Pending' },
      { id: 2, type: 'VIP', status: 'Pending' }
    ]
    const wrapper = mount(OrderList, {
      props: {
        title: 'Pending Orders',
        orders
      }
    })
    expect(wrapper.text()).toContain('Pending Orders (2)')
    expect(wrapper.findAll('.order-card')).toHaveLength(2)
  })

  it('renders empty state when no orders', () => {
    const wrapper = mount(OrderList, {
      props: {
        title: 'Pending Orders',
        orders: []
      }
    })
    expect(wrapper.text()).toContain('No orders here.')
    expect(wrapper.findAll('.order-card')).toHaveLength(0)
  })

  it('applies vip class to VIP orders', () => {
    const orders = [
      { id: 1, type: 'VIP', status: 'Pending' }
    ]
    const wrapper = mount(OrderList, {
      props: {
        title: 'Pending Orders',
        orders
      }
    })
    const card = wrapper.find('.order-card')
    expect(card.classes()).toContain('vip')
    expect(card.find('.vip-badge').exists()).toBe(true)
  })
})
