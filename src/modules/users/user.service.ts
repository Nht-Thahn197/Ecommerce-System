import prisma from "../../libs/prisma";

export const getAllUsers = async () => {
  return prisma.users.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      role: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
};
