import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, txMock, hashMock } = vi.hoisted(() => {
  const tx = {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    adminAuditLog: { create: vi.fn() }
  }
  return {
    txMock: tx,
    prismaMock: { $transaction: vi.fn() },
    hashMock: vi.fn()
  }
})

vi.mock('../server/utils/prisma', () => ({ prisma: prismaMock }))
vi.mock('argon2', () => ({
  default: { hash: hashMock, argon2id: 2 }
}))

const {
  createAdminUser,
  resetManagedUserPassword,
  updateManagedUserRole,
  updateManagedUserStatus
} = await import('../server/services/users/user-management.service')

const context = { ip: '127.0.0.1', userAgent: 'vitest' }
const target = {
  id: 2,
  username: 'member',
  email: 'member@example.com',
  role: 'USER',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('user management service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (work: (tx: typeof txMock) => unknown) => work(txMock))
    hashMock.mockResolvedValue('argon-hash')
    txMock.adminAuditLog.create.mockResolvedValue({ id: 1 })
  })

  it('hashes passwords and keeps secrets out of create audit logs', async () => {
    txMock.user.findFirst.mockResolvedValue(null)
    txMock.user.create.mockResolvedValue(target)

    await createAdminUser({
      operatorId: 1,
      data: { username: 'member', email: 'MEMBER@example.com', password: 'very-secure-password', role: 'USER', status: 'ACTIVE' },
      context
    })

    expect(hashMock).toHaveBeenCalledWith('very-secure-password', expect.any(Object))
    expect(txMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'member@example.com', passwordHash: 'argon-hash' })
    }))
    const auditInput = txMock.adminAuditLog.create.mock.calls[0][0]
    expect(JSON.stringify(auditInput)).not.toContain('very-secure-password')
    expect(JSON.stringify(auditInput)).not.toContain('argon-hash')
  })

  it('rejects duplicate usernames', async () => {
    txMock.user.findFirst.mockResolvedValue({ username: 'member', email: 'other@example.com' })

    await expect(createAdminUser({
      operatorId: 1,
      data: { username: 'member', email: 'member@example.com', password: 'very-secure-password', role: 'USER', status: 'ACTIVE' },
      context
    })).rejects.toMatchObject({ statusCode: 409, message: '用户名已被使用' })
  })

  it('prevents an administrator from demoting themselves', async () => {
    txMock.user.findUnique.mockResolvedValue({ ...target, id: 1, role: 'ADMIN' })

    await expect(updateManagedUserRole({ operatorId: 1, userId: 1, role: 'USER', context }))
      .rejects.toMatchObject({ statusCode: 409, message: '不能降低自己的管理员角色' })
    expect(txMock.user.update).not.toHaveBeenCalled()
  })

  it('keeps at least one active administrator', async () => {
    txMock.user.findUnique.mockResolvedValue({ ...target, role: 'ADMIN' })
    txMock.user.count.mockResolvedValue(1)

    await expect(updateManagedUserStatus({ operatorId: 1, userId: 2, status: 'DISABLED', context }))
      .rejects.toMatchObject({ statusCode: 409, message: '系统必须至少保留一个正常管理员' })
    expect(txMock.user.update).not.toHaveBeenCalled()
  })

  it('updates roles and writes before/after audit values', async () => {
    txMock.user.findUnique.mockResolvedValue(target)
    txMock.user.update.mockResolvedValue({ ...target, role: 'ADMIN' })

    await updateManagedUserRole({ operatorId: 1, userId: 2, role: 'ADMIN', context })

    expect(txMock.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'USER_ROLE_CHANGED',
        before: { role: 'USER' },
        after: { role: 'ADMIN' }
      })
    })
  })

  it('resets passwords without auditing the password or hash', async () => {
    txMock.user.findUnique.mockResolvedValue({ id: 2 })
    txMock.user.update.mockResolvedValue(target)

    await resetManagedUserPassword({ operatorId: 1, userId: 2, password: 'another-secure-password', context })

    const auditInput = txMock.adminAuditLog.create.mock.calls[0][0]
    expect(auditInput.data.after).toEqual({ passwordReset: true })
    expect(JSON.stringify(auditInput)).not.toContain('another-secure-password')
    expect(JSON.stringify(auditInput)).not.toContain('argon-hash')
  })
})
