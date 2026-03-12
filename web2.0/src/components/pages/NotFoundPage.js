/**
 * Not Found Page Component - 404页面
 */

export default {
    name: 'NotFoundPage',

    setup() {
        const router = VueRouter.useRouter();

        const goHome = () => {
            router.push('/');
        };

        const goBack = () => {
            router.back();
        };

        return {
            goHome,
            goBack,
        };
    },

    template: `
        <div class="container-fluid py-5">
            <div class="row justify-content-center">
                <div class="col-md-6 text-center">
                    <div class="mb-4">
                        <i class="bi bi-question-circle text-muted" style="font-size: 6rem;"></i>
                    </div>
                    <h1 class="display-4 mb-3">404</h1>
                    <h3 class="mb-3">页面未找到</h3>
                    <p class="text-muted mb-4">
                        抱歉，您访问的页面不存在或已被移除。
                    </p>
                    <div class="d-flex justify-content-center gap-3">
                        <button class="btn btn-outline-primary" @click="goBack">
                            <i class="bi bi-arrow-left me-2"></i>
                            返回上一页
                        </button>
                        <button class="btn btn-dark" @click="goHome">
                            <i class="bi bi-house me-2"></i>
                            返回首页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
};
