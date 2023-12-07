import multiprocessing as mp
from web import run_web as web_service
from samba_svc import run_app as samba_service
from proxy_svc import run_proxy as proxy_service


def main():
    try:
        queue = mp.Queue(maxsize=100)

        app = mp.Process(target=samba_service, args=(queue, True))
        app.start()

        web = mp.Process(target=web_service, args=(queue, True))
        web.start()

        proxy = mp.Process(target=proxy_service, args=(queue, True))
        proxy.start()

        app.join()
        web.join()
        proxy.join()
    except:
        print("Quitting...")

if __name__ == "__main__":
    mp.set_start_method("spawn")
    main()
