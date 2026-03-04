import prisma from "../../libs/prisma";

export const getAllUsers = async () => {
  return prisma.users.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
};
